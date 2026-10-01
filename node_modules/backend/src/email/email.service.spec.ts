import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service.js';
import {
  passwordResetTemplate,
  emailVerificationTemplate,
  temporaryPasswordTemplate,
} from './templates.js';

const configWith = (values: Record<string, string | undefined>) => ({
  get: (key: string) => values[key],
});

const buildService = (values: Record<string, string | undefined> = {}) => {
  return new EmailService(configWith(values) as ConfigService);
};

describe('EmailService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getMode', () => {
    it('usa brevo-api cuando hay BREVO_API_KEY', () => {
      const service = buildService({ BREVO_API_KEY: 'xkeysib-abc' });
      expect(service.getMode()).toBe('brevo-api');
    });

    it('usa smtp cuando hay host/user/pass y no hay api key', () => {
      const service = buildService({
        SMTP_HOST: 'smtp-relay.brevo.com',
        SMTP_USER: 'a@b.com',
        SMTP_PASS: 'secret',
      });
      expect(service.getMode()).toBe('smtp');
    });

    it('cae a stub sin configuración', () => {
      const service = buildService({});
      expect(service.getMode()).toBe('stub');
    });

    it('prefiere brevo-api si hay ambas configuraciones', () => {
      const service = buildService({
        BREVO_API_KEY: 'xkeysib-abc',
        SMTP_HOST: 'smtp-relay.brevo.com',
        SMTP_USER: 'a@b.com',
        SMTP_PASS: 'secret',
      });
      expect(service.getMode()).toBe('brevo-api');
    });
  });

  describe('send vía Brevo API', () => {
    it('envía con sender parseado y no lanza', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '',
      });
      vi.stubGlobal('fetch', fetchMock);

      const service = buildService({
        BREVO_API_KEY: 'xkeysib-abc',
        EMAIL_FROM: 'Mi SaaS <hola@ejemplo.com>',
      });

      await service.send({ to: 'dest@x.com', subject: 'Hola', html: '<p>Hi</p>' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain('api.brevo.com');
      expect(init.headers['api-key']).toBe('xkeysib-abc');
      const body = JSON.parse(init.body);
      expect(body.sender).toEqual({ email: 'hola@ejemplo.com', name: 'Mi SaaS' });
      expect(body.to).toEqual([{ email: 'dest@x.com' }]);
    });

    it('lanza 500 honesto ante 401 sin reintentar', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => '{"message":"Key not found"}',
      });
      vi.stubGlobal('fetch', fetchMock);

      const service = buildService({ BREVO_API_KEY: 'mala' });

      await expect(
        service.send({ to: 'dest@x.com', subject: 'Hola', html: '<p>Hi</p>' }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('reintenta una vez ante error 500 y luego tiene éxito', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'x' })
        .mockResolvedValueOnce({ ok: true, text: async () => '' });
      vi.stubGlobal('fetch', fetchMock);

      const service = buildService({ BREVO_API_KEY: 'xkeysib-abc' });

      await service.send({ to: 'dest@x.com', subject: 'Hola', html: '<p>Hi</p>' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('acepta remitente sin nombre', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
      vi.stubGlobal('fetch', fetchMock);

      const service = buildService({
        BREVO_API_KEY: 'xkeysib-abc',
        EMAIL_FROM: 'hola@ejemplo.com',
      });

      await service.send({ to: 'dest@x.com', subject: 'Hola', html: '<p>Hi</p>' });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.sender).toEqual({ email: 'hola@ejemplo.com' });
    });
  });

  describe('modo stub', () => {
    it('no llama a fetch y no lanza sin configuración', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const service = buildService({ NODE_ENV: 'development' });
      await service.send({ to: 'dest@x.com', subject: 'Hola', html: '<p>Hi</p>' });

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('templates', () => {
    it('reseteo incluye token y URL sin exponer secretos extra', () => {
      const { subject, html } = passwordResetTemplate('TOKEN123', 'https://app/reset?token=TOKEN123');
      expect(subject).toContain('Recuperación');
      expect(html).toContain('TOKEN123');
      expect(html).toContain('https://app/reset?token=TOKEN123');
    });

    it('verificación incluye URL y token', () => {
      const { subject, html } = emailVerificationTemplate('https://app/verify?token=T', 'T');
      expect(subject).toContain('Verifica');
      expect(html).toContain('https://app/verify?token=T');
    });

    it('temporal incluye clave y login sin el hash', () => {
      const { subject, html } = temporaryPasswordTemplate('Temporal1', 'https://app/login');
      expect(subject).toContain('temporal');
      expect(html).toContain('Temporal1');
      expect(html).toContain('https://app/login');
    });
  });
});
