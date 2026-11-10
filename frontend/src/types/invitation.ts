export interface CreateInvitationPayload {
  email: string;
  name?: string;
  roleIds: string[];
}

export interface CreatedInvitation {
  id: string;
  email: string;
  expiresAt: string;
  emailSent: boolean;
}

export interface CreatedInvitationResponse {
  success: boolean;
  message: string;
  data: CreatedInvitation;
}

export interface InvitationPreview {
  email: string;
  name: string | null;
  companyName: string;
  requiresLogin: boolean;
  expiresAt: string;
}

export interface InvitationPreviewResponse {
  success: boolean;
  data: InvitationPreview;
}

export interface PendingInvitation {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  expires_at: string;
  created_at: string;
}

export interface PendingInvitationsResponse {
  success: boolean;
  data: PendingInvitation[];
}

export interface AcceptInvitationResponse {
  success: boolean;
  message: string;
  data: {
    email?: string;
    companyName: string;
    alreadyMember?: boolean;
  };
}
