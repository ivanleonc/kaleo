import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PartiesRepository } from './parties.repository.js';
import { EntitlementService } from '../kernel/billing/entitlement.service.js';
import {
  PARTY_IDENTITY_KINDS,
  PARTY_ROLES,
  type CreatePartyInput,
  type PartyAddressInput,
  type PartyContactInput,
  type PartyDetail,
  type PartyIdentityInput,
  type PartyIdentityKind,
  type PartyListFilters,
  type PartyListItem,
  type PartyRole,
  type UpdatePartyInput,
} from './parties.types.js';

export const PARTIES_MODULE_CODE = 'shared.parties';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface NormalizedIdentity {
  kind: PartyIdentityKind;
  value: string;
  normalized: string;
  isVerified: boolean;
}

@Injectable()
export class PartiesService {
  constructor(
    private readonly repository: PartiesRepository,
    private readonly entitlements: EntitlementService,
  ) {}

  list(
    companyId: string,
    filters: PartyListFilters,
  ): Promise<{ data: PartyListItem[]; total: number }> {
    return this.repository.list(companyId, filters);
  }

  async get(companyId: string, partyId: string): Promise<PartyDetail> {
    const party = await this.repository.findById(companyId, partyId);
    if (!party) throw new NotFoundException('Tercero no encontrado');
    return party;
  }

  async create(
    companyId: string,
    userId: string,
    input: CreatePartyInput,
  ): Promise<PartyDetail> {
    await this.entitlements.assertWritableModule(companyId, PARTIES_MODULE_CODE);

    const name = requiredText(input.name, 'El nombre es obligatorio');
    const taxId = optionalText(input.taxId);
    if (taxId) {
      const existing = await this.repository.findByTaxId(companyId, taxId);
      if (existing) {
        throw new ConflictException('Ya existe un tercero con ese documento fiscal');
      }
    }

    const email = normalizeEmail(input.email);
    const phone = optionalText(input.phone);
    const identities = buildIdentities([
      ...(email ? [{ kind: 'email' as const, value: email }] : []),
      ...(phone ? [{ kind: 'phone' as const, value: phone }] : []),
      ...(input.identities ?? []),
    ]);

    try {
      return await this.repository.create(companyId, userId, {
        partyType: input.partyType,
        name,
        legalName: optionalText(input.legalName),
        taxId,
        email,
        phone,
        roles: normalizeRoles(input.roles),
        identities,
      });
    } catch (error) {
      throw mapUniqueViolation(error);
    }
  }

  async update(
    companyId: string,
    userId: string,
    partyId: string,
    input: UpdatePartyInput,
  ): Promise<PartyDetail> {
    await this.entitlements.assertWritableModule(companyId, PARTIES_MODULE_CODE);
    const current = await this.get(companyId, partyId);

    if (
      input.taxId !== undefined &&
      input.taxId !== null &&
      input.taxId.trim() &&
      input.taxId.trim().toLowerCase() !== (current.tax_id ?? '').toLowerCase()
    ) {
      const existing = await this.repository.findByTaxId(companyId, input.taxId.trim());
      if (existing && existing !== partyId) {
        throw new ConflictException('Ya existe un tercero con ese documento fiscal');
      }
    }

    const email =
      input.email === undefined ? undefined : normalizeEmail(input.email);
    const phone =
      input.phone === undefined ? undefined : optionalText(input.phone);
    const identities: NormalizedIdentity[] = [];
    if (email) identities.push(buildIdentity('email', email));
    if (phone) identities.push(buildIdentity('phone', phone));

    let detail;
    try {
      detail = await this.repository.update(
        companyId,
        userId,
        partyId,
        {
          partyType: input.partyType,
          name: input.name === undefined ? undefined : requiredText(input.name, 'El nombre es obligatorio'),
          legalName: input.legalName === undefined ? undefined : optionalText(input.legalName),
          taxId: input.taxId === undefined ? undefined : optionalText(input.taxId),
          email,
          phone,
          status: input.status,
        },
        identities,
      );
    } catch (error) {
      throw mapUniqueViolation(error);
    }
    if (!detail) throw new NotFoundException('Tercero no encontrado');
    return detail;
  }

  async delete(companyId: string, userId: string, partyId: string): Promise<void> {
    await this.entitlements.assertWritableModule(companyId, PARTIES_MODULE_CODE);
    const deleted = await this.repository.softDelete(companyId, userId, partyId);
    if (!deleted) throw new NotFoundException('Tercero no encontrado');
  }

  async addRole(
    companyId: string,
    partyId: string,
    role: PartyRole,
  ): Promise<PartyRole> {
    await this.entitlements.assertWritableModule(companyId, PARTIES_MODULE_CODE);
    const result = await this.repository.addRole(companyId, partyId, role);
    if (!result) throw new NotFoundException('Tercero no encontrado');
    return result.role;
  }

  async removeRole(companyId: string, partyId: string, role: PartyRole): Promise<void> {
    await this.entitlements.assertWritableModule(companyId, PARTIES_MODULE_CODE);
    const removed = await this.repository.removeRole(companyId, partyId, role);
    if (!removed) throw new NotFoundException('Rol no encontrado');
  }

  async addIdentity(
    companyId: string,
    partyId: string,
    input: PartyIdentityInput,
  ) {
    await this.entitlements.assertWritableModule(companyId, PARTIES_MODULE_CODE);
    return this.repository.addIdentity(companyId, partyId, buildIdentity(input.kind, input.value, input.isVerified));
  }

  async removeIdentity(companyId: string, partyId: string, identityId: string): Promise<void> {
    await this.entitlements.assertWritableModule(companyId, PARTIES_MODULE_CODE);
    const removed = await this.repository.removeIdentity(companyId, partyId, identityId);
    if (!removed) throw new NotFoundException('Identidad no encontrada');
  }

  async addContact(companyId: string, partyId: string, input: PartyContactInput) {
    await this.entitlements.assertWritableModule(companyId, PARTIES_MODULE_CODE);
    return this.repository.addContact(companyId, partyId, {
      name: requiredText(input.name, 'El nombre del contacto es obligatorio'),
      roleTitle: optionalText(input.roleTitle),
      email: normalizeEmail(input.email),
      phone: optionalText(input.phone),
      isPrimary: input.isPrimary,
    });
  }

  async updateContact(
    companyId: string,
    partyId: string,
    contactId: string,
    input: Partial<PartyContactInput>,
  ) {
    await this.entitlements.assertWritableModule(companyId, PARTIES_MODULE_CODE);
    const contact = await this.repository.updateContact(companyId, partyId, contactId, {
      name: input.name === undefined ? undefined : requiredText(input.name, 'El nombre del contacto es obligatorio'),
      roleTitle: input.roleTitle === undefined ? undefined : optionalText(input.roleTitle),
      email: input.email === undefined ? undefined : normalizeEmail(input.email),
      phone: input.phone === undefined ? undefined : optionalText(input.phone),
      isPrimary: input.isPrimary,
    });
    if (!contact) throw new NotFoundException('Contacto no encontrado');
    return contact;
  }

  async removeContact(companyId: string, partyId: string, contactId: string): Promise<void> {
    await this.entitlements.assertWritableModule(companyId, PARTIES_MODULE_CODE);
    const removed = await this.repository.removeContact(companyId, partyId, contactId);
    if (!removed) throw new NotFoundException('Contacto no encontrado');
  }

  async addAddress(companyId: string, partyId: string, input: PartyAddressInput) {
    await this.entitlements.assertWritableModule(companyId, PARTIES_MODULE_CODE);
    return this.repository.addAddress(companyId, partyId, {
      label: optionalText(input.label),
      address: requiredText(input.address, 'La dirección es obligatoria'),
      city: optionalText(input.city),
      state: optionalText(input.state),
      country: optionalText(input.country),
      postalCode: optionalText(input.postalCode),
      isPrimary: input.isPrimary,
    });
  }

  async updateAddress(
    companyId: string,
    partyId: string,
    addressId: string,
    input: Partial<PartyAddressInput>,
  ) {
    await this.entitlements.assertWritableModule(companyId, PARTIES_MODULE_CODE);
    const address = await this.repository.updateAddress(companyId, partyId, addressId, {
      label: input.label === undefined ? undefined : optionalText(input.label),
      address: input.address === undefined ? undefined : requiredText(input.address, 'La dirección es obligatoria'),
      city: input.city === undefined ? undefined : optionalText(input.city),
      state: input.state === undefined ? undefined : optionalText(input.state),
      country: input.country === undefined ? undefined : optionalText(input.country),
      postalCode: input.postalCode === undefined ? undefined : optionalText(input.postalCode),
      isPrimary: input.isPrimary,
    });
    if (!address) throw new NotFoundException('Dirección no encontrada');
    return address;
  }

  async removeAddress(companyId: string, partyId: string, addressId: string): Promise<void> {
    await this.entitlements.assertWritableModule(companyId, PARTIES_MODULE_CODE);
    const removed = await this.repository.removeAddress(companyId, partyId, addressId);
    if (!removed) throw new NotFoundException('Dirección no encontrada');
  }
}

function requiredText(value: string | null | undefined, message: string): string {
  const text = value?.trim();
  if (!text) throw new BadRequestException(message);
  return text;
}

function optionalText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function normalizeEmail(value: string | null | undefined): string | null {
  const email = optionalText(value);
  if (!email) return null;
  if (!EMAIL_RE.test(email)) {
    throw new BadRequestException('El correo no tiene un formato válido');
  }
  return email.toLowerCase();
}

function normalizeRoles(roles?: PartyRole[]): PartyRole[] {
  if (roles === undefined) return ['contact'];
  const unique = [...new Set(roles)];
  const invalid = unique.find((role) => !PARTY_ROLES.includes(role));
  if (invalid) throw new BadRequestException(`Rol de tercero inválido: ${invalid}`);
  return unique;
}

function buildIdentities(inputs: PartyIdentityInput[]): NormalizedIdentity[] {
  const result = new Map<string, NormalizedIdentity>();
  for (const input of inputs) {
    const identity = buildIdentity(input.kind, input.value, input.isVerified);
    result.set(`${identity.kind}:${identity.normalized}`, identity);
  }
  return [...result.values()];
}

function buildIdentity(
  kind: PartyIdentityKind,
  value: string,
  isVerified = false,
): NormalizedIdentity {
  if (!PARTY_IDENTITY_KINDS.includes(kind)) {
    throw new BadRequestException(`Tipo de identidad inválido: ${kind}`);
  }
  const original = requiredText(value, 'La identidad no puede estar vacía');
  const normalized = normalizeIdentityValue(kind, original);
  if (!normalized) {
    throw new BadRequestException('La identidad no tiene un valor válido');
  }
  if (kind === 'email' && !EMAIL_RE.test(original.toLowerCase())) {
    throw new BadRequestException('El correo de la identidad no es válido');
  }
  return {
    kind,
    value: original,
    normalized,
    isVerified,
  };
}

function mapUniqueViolation(error: unknown): Error {
  if ((error as { code?: string })?.code === '23505') {
    return new ConflictException(
      'Ya existe un tercero o una identidad con esos datos',
    );
  }
  return error as Error;
}

function normalizeIdentityValue(kind: PartyIdentityKind, value: string): string {
  switch (kind) {
    case 'email':
    case 'external':
      return value.trim().toLowerCase();
    case 'phone':
    case 'whatsapp': {
      const hasPlus = value.trim().startsWith('+');
      const digits = value.replace(/\D/g, '');
      return digits ? `${hasPlus ? '+' : ''}${digits}` : '';
    }
    case 'telegram':
      return value.trim().replace(/^@/, '').toLowerCase();
    case 'web':
      return value.trim().toLowerCase().replace(/\/+$/, '');
    default:
      return value.trim().toLowerCase();
  }
}

