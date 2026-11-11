import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { withTenantTransaction } from '../common/tenancy/tenant-transaction.js';
import { TenantContextService } from '../common/tenancy/tenant-context.service.js';
import { buildDynamicUpdate } from '../common/utils/sql.helper.js';
import type {
  PartyAddressInput,
  PartyAddressRow,
  PartyContactInput,
  PartyContactRow,
  PartyDetail,
  PartyIdentityKind,
  PartyIdentityRow,
  PartyListItem,
  PartyListFilters,
  PartyRole,
  PartyRoleRow,
  PartyRow,
} from './parties.types.js';

const SORT_COLUMNS: Record<string, string> = {
  name: 'p.name',
  party_type: 'p.party_type',
  status: 'p.status',
  created_at: 'p.created_at',
  updated_at: 'p.updated_at',
};

interface NormalizedIdentity {
  kind: PartyIdentityKind;
  value: string;
  normalized: string;
  isVerified: boolean;
}

@Injectable()
export class PartiesRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  private assertCompany(companyId: string): void {
    if (this.tenantContext.requireCompanyId() !== companyId) {
      throw new ForbiddenException('La empresa no coincide con el TenantContext');
    }
  }

  async list(
    companyId: string,
    filters: PartyListFilters,
  ): Promise<{ data: PartyListItem[]; total: number }> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const values: unknown[] = [companyId];
      const where = ['p.company_id = $1', 'p.deleted_at IS NULL'];

      if (filters.search) {
        values.push(`%${filters.search}%`);
        const index = `$${values.length}`;
        where.push(`(
          p.name ILIKE ${index}
          OR COALESCE(p.legal_name, '') ILIKE ${index}
          OR COALESCE(p.tax_id, '') ILIKE ${index}
          OR COALESCE(p.email, '') ILIKE ${index}
          OR COALESCE(p.phone, '') ILIKE ${index}
          OR EXISTS (
            SELECT 1 FROM party_identities pi
            WHERE pi.company_id = p.company_id AND pi.party_id = p.id
              AND pi.normalized_value ILIKE ${index}
          )
        )`);
      }
      if (filters.partyType) {
        values.push(filters.partyType);
        where.push(`p.party_type = $${values.length}`);
      }
      if (filters.status) {
        values.push(filters.status);
        where.push(`p.status = $${values.length}`);
      }
      if (filters.role) {
        values.push(filters.role);
        where.push(
          `EXISTS (
            SELECT 1 FROM party_roles pr
            WHERE pr.company_id = p.company_id AND pr.party_id = p.id
              AND pr.role = $${values.length}
          )`,
        );
      }

      const whereSql = where.join(' AND ');
      const count = (await queryRunner.query(
        `SELECT COUNT(*)::int AS total FROM parties p WHERE ${whereSql}`,
        values,
      )) as Array<{ total: number }>;

      const sortColumn = SORT_COLUMNS[filters.sortBy ?? ''] ?? 'p.name';
      const sortDir = filters.sortDir === 'desc' ? 'DESC' : 'ASC';
      const page = Math.max(filters.page, 1);
      const limit = Math.min(Math.max(filters.limit, 1), 100);
      values.push(limit, (page - 1) * limit);

      const rows = (await queryRunner.query(
        `SELECT p.*,
                ARRAY(
                  SELECT pr.role FROM party_roles pr
                  WHERE pr.company_id = p.company_id AND pr.party_id = p.id
                  ORDER BY pr.role
                ) AS roles,
                (SELECT COUNT(*)::int FROM party_identities pi WHERE pi.party_id = p.id)
                  AS identities_count,
                (SELECT COUNT(*)::int FROM party_contacts pc WHERE pc.party_id = p.id)
                  AS contacts_count
         FROM parties p
         WHERE ${whereSql}
         ORDER BY ${sortColumn} ${sortDir}, p.name ASC
         LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      )) as PartyListItem[];

      return { data: rows, total: count[0]?.total ?? 0 };
    });
  }

  async findById(companyId: string, partyId: string): Promise<PartyDetail | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const parties = (await queryRunner.query(
        `SELECT * FROM parties
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
        [partyId, companyId],
      )) as PartyRow[];
      if (!parties[0]) return null;

      const roles = (await queryRunner.query(
        `SELECT role FROM party_roles
         WHERE company_id = $1 AND party_id = $2
         ORDER BY role`,
        [companyId, partyId],
      )) as Array<{ role: PartyRole }>;
      const identities = (await queryRunner.query(
        `SELECT * FROM party_identities
         WHERE company_id = $1 AND party_id = $2
         ORDER BY kind, created_at`,
        [companyId, partyId],
      )) as PartyIdentityRow[];
      const contacts = (await queryRunner.query(
        `SELECT * FROM party_contacts
         WHERE company_id = $1 AND party_id = $2
         ORDER BY is_primary DESC, created_at`,
        [companyId, partyId],
      )) as PartyContactRow[];
      const addresses = (await queryRunner.query(
        `SELECT * FROM party_addresses
         WHERE company_id = $1 AND party_id = $2
         ORDER BY is_primary DESC, created_at`,
        [companyId, partyId],
      )) as PartyAddressRow[];

      return {
        ...parties[0],
        roles: roles.map((row) => row.role),
        identities,
        contacts,
        addresses,
      };
    });
  }

  async findByTaxId(companyId: string, taxId: string): Promise<string | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `SELECT id FROM parties
         WHERE company_id = $1 AND lower(tax_id) = lower($2) AND deleted_at IS NULL`,
        [companyId, taxId],
      )) as Array<{ id: string }>;
      return rows[0]?.id ?? null;
    });
  }

  async create(
    companyId: string,
    userId: string,
    input: {
      partyType: string;
      name: string;
      legalName: string | null;
      taxId: string | null;
      email: string | null;
      phone: string | null;
      roles: PartyRole[];
      identities: NormalizedIdentity[];
    },
  ): Promise<PartyDetail> {
    this.assertCompany(companyId);

    const partyId = await withTenantTransaction(
      this.dataSource,
      this.tenantContext,
      async (queryRunner) => {
        const rows = (await queryRunner.query(
          `INSERT INTO parties
             (company_id, party_type, name, legal_name, tax_id, email, phone,
              created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
           RETURNING id`,
          [
            companyId,
            input.partyType,
            input.name,
            input.legalName,
            input.taxId,
            input.email,
            input.phone,
            userId,
          ],
        )) as Array<{ id: string }>;
        const id = rows[0]!.id;

        for (const role of input.roles) {
          await queryRunner.query(
            `INSERT INTO party_roles (company_id, party_id, role)
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [companyId, id, role],
          );
        }

        for (const identity of input.identities) {
          await this.assertIdentityAvailable(
            queryRunner,
            companyId,
            identity.kind,
            identity.normalized,
            id,
          );
          await queryRunner.query(
            `INSERT INTO party_identities
               (company_id, party_id, kind, value, normalized_value, is_verified)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (company_id, kind, normalized_value) DO NOTHING`,
            [
              companyId,
              id,
              identity.kind,
              identity.value,
              identity.normalized,
              identity.isVerified,
            ],
          );
        }

        return id;
      },
    );

    const detail = await this.findById(companyId, partyId);
    if (!detail) throw new NotFoundException('Tercero no encontrado');
    return detail;
  }

  async update(
    companyId: string,
    userId: string,
    partyId: string,
    patch: {
      partyType?: string;
      name?: string;
      legalName?: string | null;
      taxId?: string | null;
      email?: string | null;
      phone?: string | null;
      status?: string;
    },
    identities: NormalizedIdentity[] = [],
  ): Promise<PartyDetail | null> {
    this.assertCompany(companyId);
    const updated = await withTenantTransaction(
      this.dataSource,
      this.tenantContext,
      async (queryRunner) => {
        const data = {
          party_type: patch.partyType,
          name: patch.name,
          legal_name: patch.legalName,
          tax_id: patch.taxId,
          email: patch.email,
          phone: patch.phone,
          status: patch.status,
          updated_by: userId,
        };
        const { updates, values, startIndex } = buildDynamicUpdate(data, [
          'party_type',
          'name',
          'legal_name',
          'tax_id',
          'email',
          'phone',
          'status',
          'updated_by',
        ], {
          nullEmptyStrings: ['legal_name', 'tax_id', 'email', 'phone'],
          extraSet: ['updated_at = now()'],
        });

        values.push(partyId, companyId);
        const rows = (await queryRunner.query(
          `UPDATE parties
           SET ${updates.join(', ')}
           WHERE id = $${startIndex} AND company_id = $${startIndex + 1}
             AND deleted_at IS NULL
           RETURNING *`,
          values,
        )) as PartyRow[];
        if (!rows[0]) return null;

        for (const identity of identities) {
          await this.assertIdentityAvailable(
            queryRunner,
            companyId,
            identity.kind,
            identity.normalized,
            partyId,
          );
          await queryRunner.query(
            `INSERT INTO party_identities
               (company_id, party_id, kind, value, normalized_value, is_verified)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (company_id, kind, normalized_value) DO NOTHING`,
            [
              companyId,
              partyId,
              identity.kind,
              identity.value,
              identity.normalized,
              identity.isVerified,
            ],
          );
        }

        return rows[0];
      },
    );

    if (!updated) return null;
    return this.findById(companyId, partyId);
  }

  async softDelete(companyId: string, userId: string, partyId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `UPDATE parties
         SET deleted_at = now(), updated_by = $3
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [partyId, companyId, userId],
      )) as Array<{ id: string }>;
      if (!rows[0]) return false;

      // Libera identidades para que el email/teléfono pueda reutilizarse.
      await queryRunner.query(
        `DELETE FROM party_identities WHERE company_id = $1 AND party_id = $2`,
        [companyId, partyId],
      );
      return true;
    });
  }

  async addRole(
    companyId: string,
    partyId: string,
    role: PartyRole,
  ): Promise<PartyRoleRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `INSERT INTO party_roles (company_id, party_id, role)
         SELECT $1, p.id, $3 FROM parties p
         WHERE p.id = $2 AND p.company_id = $1 AND p.deleted_at IS NULL
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [companyId, partyId, role],
      )) as PartyRoleRow[];
      if (rows[0]) return rows[0];
      const existing = (await queryRunner.query(
        `SELECT * FROM party_roles
         WHERE company_id = $1 AND party_id = $2 AND role = $3`,
        [companyId, partyId, role],
      )) as PartyRoleRow[];
      return existing[0] ?? null;
    });
  }

  async removeRole(companyId: string, partyId: string, role: PartyRole): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `DELETE FROM party_roles
         WHERE company_id = $1 AND party_id = $2 AND role = $3
         RETURNING role`,
        [companyId, partyId, role],
      )) as Array<{ role: string }>;
      return Boolean(rows[0]);
    });
  }

  async addIdentity(
    companyId: string,
    partyId: string,
    identity: NormalizedIdentity,
  ): Promise<PartyIdentityRow> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const party = await this.assertPartyExists(queryRunner, companyId, partyId);
      if (!party) throw new NotFoundException('Tercero no encontrado');

      await this.assertIdentityAvailable(
        queryRunner,
        companyId,
        identity.kind,
        identity.normalized,
        partyId,
      );
      const rows = (await queryRunner.query(
        `INSERT INTO party_identities
           (company_id, party_id, kind, value, normalized_value, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          companyId,
          partyId,
          identity.kind,
          identity.value,
          identity.normalized,
          identity.isVerified,
        ],
      )) as PartyIdentityRow[];
      return rows[0]!;
    });
  }

  async removeIdentity(companyId: string, partyId: string, identityId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `DELETE FROM party_identities
         WHERE id = $1 AND party_id = $2 AND company_id = $3
         RETURNING id`,
        [identityId, partyId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async addContact(
    companyId: string,
    partyId: string,
    input: PartyContactInput,
  ): Promise<PartyContactRow> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      await this.assertPartyExists(queryRunner, companyId, partyId);
      if (input.isPrimary) {
        await queryRunner.query(
          `UPDATE party_contacts SET is_primary = false
           WHERE company_id = $1 AND party_id = $2 AND is_primary`,
          [companyId, partyId],
        );
      }
      const rows = (await queryRunner.query(
        `INSERT INTO party_contacts
           (company_id, party_id, name, role_title, email, phone, is_primary)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          companyId,
          partyId,
          input.name,
          input.roleTitle ?? null,
          input.email ?? null,
          input.phone ?? null,
          input.isPrimary ?? false,
        ],
      )) as PartyContactRow[];
      return rows[0]!;
    });
  }

  async updateContact(
    companyId: string,
    partyId: string,
    contactId: string,
    input: Partial<PartyContactInput>,
  ): Promise<PartyContactRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      if (input.isPrimary) {
        await queryRunner.query(
          `UPDATE party_contacts SET is_primary = false
           WHERE company_id = $1 AND party_id = $2 AND is_primary AND id <> $3`,
          [companyId, partyId, contactId],
        );
      }
      const data = {
        name: input.name,
        role_title: input.roleTitle,
        email: input.email,
        phone: input.phone,
        is_primary: input.isPrimary,
      };
      const { updates, values, startIndex } = buildDynamicUpdate(data, [
        'name',
        'role_title',
        'email',
        'phone',
        'is_primary',
      ], {
        nullEmptyStrings: ['role_title', 'email', 'phone'],
        extraSet: ['updated_at = now()'],
      });
      if (updates.length === 0) return null;
      values.push(contactId, partyId, companyId);
      const rows = (await queryRunner.query(
        `UPDATE party_contacts
         SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND party_id = $${startIndex + 1}
           AND company_id = $${startIndex + 2}
         RETURNING *`,
        values,
      )) as PartyContactRow[];
      return rows[0] ?? null;
    });
  }

  async removeContact(companyId: string, partyId: string, contactId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `DELETE FROM party_contacts
         WHERE id = $1 AND party_id = $2 AND company_id = $3
         RETURNING id`,
        [contactId, partyId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  async addAddress(
    companyId: string,
    partyId: string,
    input: PartyAddressInput,
  ): Promise<PartyAddressRow> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      await this.assertPartyExists(queryRunner, companyId, partyId);
      if (input.isPrimary) {
        await queryRunner.query(
          `UPDATE party_addresses SET is_primary = false
           WHERE company_id = $1 AND party_id = $2 AND is_primary`,
          [companyId, partyId],
        );
      }
      const rows = (await queryRunner.query(
        `INSERT INTO party_addresses
           (company_id, party_id, label, address, city, state, country,
            postal_code, is_primary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          companyId,
          partyId,
          input.label ?? null,
          input.address,
          input.city ?? null,
          input.state ?? null,
          input.country ?? null,
          input.postalCode ?? null,
          input.isPrimary ?? false,
        ],
      )) as PartyAddressRow[];
      return rows[0]!;
    });
  }

  async updateAddress(
    companyId: string,
    partyId: string,
    addressId: string,
    input: Partial<PartyAddressInput>,
  ): Promise<PartyAddressRow | null> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      if (input.isPrimary) {
        await queryRunner.query(
          `UPDATE party_addresses SET is_primary = false
           WHERE company_id = $1 AND party_id = $2 AND is_primary AND id <> $3`,
          [companyId, partyId, addressId],
        );
      }
      const data = {
        label: input.label,
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country,
        postal_code: input.postalCode,
        is_primary: input.isPrimary,
      };
      const { updates, values, startIndex } = buildDynamicUpdate(data, [
        'label',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        'is_primary',
      ], {
        nullEmptyStrings: ['label', 'city', 'state', 'country', 'postal_code'],
        extraSet: ['updated_at = now()'],
      });
      if (updates.length === 0) return null;
      values.push(addressId, partyId, companyId);
      const rows = (await queryRunner.query(
        `UPDATE party_addresses
         SET ${updates.join(', ')}
         WHERE id = $${startIndex} AND party_id = $${startIndex + 1}
           AND company_id = $${startIndex + 2}
         RETURNING *`,
        values,
      )) as PartyAddressRow[];
      return rows[0] ?? null;
    });
  }

  async removeAddress(companyId: string, partyId: string, addressId: string): Promise<boolean> {
    this.assertCompany(companyId);
    return withTenantTransaction(this.dataSource, this.tenantContext, async (queryRunner) => {
      const rows = (await queryRunner.query(
        `DELETE FROM party_addresses
         WHERE id = $1 AND party_id = $2 AND company_id = $3
         RETURNING id`,
        [addressId, partyId, companyId],
      )) as Array<{ id: string }>;
      return Boolean(rows[0]);
    });
  }

  private async assertPartyExists(
    queryRunner: QueryRunner,
    companyId: string,
    partyId: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      `SELECT id FROM parties
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [partyId, companyId],
    )) as Array<{ id: string }>;
    if (!rows[0]) throw new NotFoundException('Tercero no encontrado');
    return true;
  }

  private async assertIdentityAvailable(
    queryRunner: QueryRunner,
    companyId: string,
    kind: PartyIdentityKind,
    normalized: string,
    partyId: string,
  ): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT party_id FROM party_identities
       WHERE company_id = $1 AND kind = $2 AND normalized_value = $3
         AND party_id <> $4`,
      [companyId, kind, normalized, partyId],
    )) as Array<{ party_id: string }>;
    if (rows[0]) {
      throw new ConflictException(
        `La identidad ${kind} ya está asociada a otro tercero`,
      );
    }
  }
}
