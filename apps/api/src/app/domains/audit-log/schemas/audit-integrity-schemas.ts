import { Type } from '@sinclair/typebox';

// Request schemas
export const VerifyIntegrityRequestSchema = Type.Object({
  from_date: Type.String({
    format: 'date-time',
    description: 'Start date for verification (ISO 8601)',
    examples: ['2024-01-01T00:00:00Z']
  }),
  to_date: Type.String({
    format: 'date-time', 
    description: 'End date for verification (ISO 8601)',
    examples: ['2024-01-31T23:59:59Z']
  })
}, {
  title: 'VerifyIntegrityRequest',
  description: 'Request body for verifying audit log integrity within a date range'
});

export const DetectTamperingRequestSchema = Type.Object({
  from_date: Type.Optional(Type.String({
    format: 'date-time',
    description: 'Start date for detection (optional)',
    examples: ['2024-01-01T00:00:00Z']
  })),
  to_date: Type.Optional(Type.String({
    format: 'date-time',
    description: 'End date for detection (optional)', 
    examples: ['2024-01-31T23:59:59Z']
  }))
}, {
  title: 'DetectTamperingRequest',
  description: 'Request body for detecting tampering in audit logs'
});

export const VerifyProofRequestSchema = Type.Object({
  proof: Type.String({
    description: 'Base64-encoded integrity proof',
    minLength: 1,
    examples: ['eyJyZWNvcmRfaWQiOiI...']
  })
}, {
  title: 'VerifyProofRequest',
  description: 'Request body for verifying integrity proof'
});

export const FullCheckRequestSchema = Type.Object({
  batch_size: Type.Optional(Type.Number({
    minimum: 100,
    maximum: 10000,
    default: 1000,
    description: 'Number of records to process in each batch'
  }))
}, {
  title: 'FullCheckRequest',
  description: 'Request body for running full integrity check'
});

// Response schemas
export const SecurityStatsResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    total_records: Type.Number({ description: 'Total number of audit records' }),
    verified_records: Type.Number({ description: 'Number of verified records' }),
    unverified_records: Type.Number({ description: 'Number of unverified records' }),
    last_verification: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    integrity_score: Type.Number({ 
      minimum: 0, 
      maximum: 100,
      description: 'Integrity score as percentage (0-100)'
    })
  })
}, {
  title: 'SecurityStatsResponse',
  description: 'Security statistics response'
});

export const IntegrityVerificationResultSchema = Type.Object({
  is_valid: Type.Boolean({ description: 'Overall integrity validation result' }),
  errors: Type.Array(Type.String(), { description: 'List of validation errors' }),
  verified_count: Type.Number({ description: 'Number of successfully verified records' }),
  tampered_records: Type.Array(Type.String(), { description: 'List of tampered record IDs' })
}, {
  title: 'IntegrityVerificationResult',
  description: 'Result of integrity verification'
});

export const VerifyIntegrityResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    verification_result: IntegrityVerificationResultSchema,
    period: Type.Object({
      from: Type.String({ format: 'date-time' }),
      to: Type.String({ format: 'date-time' })
    })
  })
}, {
  title: 'VerifyIntegrityResponse',
  description: 'Integrity verification response'
});

export const TamperingDetectionResultSchema = Type.Object({
  total_records: Type.Number({ description: 'Total number of records checked' }),
  verified_records: Type.Number({ description: 'Number of verified records' }),
  tampered_records: Type.Array(Type.String(), { description: 'List of tampered record IDs' }),
  integrity_score: Type.Number({ 
    minimum: 0, 
    maximum: 100,
    description: 'Integrity score as percentage (0-100)'
  }),
  last_check: Type.String({ format: 'date-time', description: 'Timestamp of the check' })
}, {
  title: 'TamperingDetectionResult',
  description: 'Result of tampering detection'
});

export const DetectTamperingResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: TamperingDetectionResultSchema,
  alert: Type.Union([
    Type.Literal('TAMPERING_DETECTED'),
    Type.Null()
  ], { description: 'Alert status if tampering is detected' })
}, {
  title: 'DetectTamperingResponse',
  description: 'Tampering detection response'
});

export const IntegrityProofResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    audit_id: Type.String({ description: 'UUID of the audit record' }),
    integrity_proof: Type.String({ description: 'Base64-encoded integrity proof' }),
    generated_at: Type.String({ format: 'date-time' }),
    verification_instructions: Type.String({
      description: 'Instructions for verifying the proof'
    })
  })
}, {
  title: 'IntegrityProofResponse',
  description: 'Integrity proof generation response'
});

export const VerifyProofResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    is_valid: Type.Boolean({ description: 'Whether the proof is valid' }),
    verified_at: Type.String({ format: 'date-time' }),
    status: Type.Union([
      Type.Literal('PROOF_VALID'),
      Type.Literal('PROOF_INVALID')
    ], { description: 'Verification status' })
  })
}, {
  title: 'VerifyProofResponse',
  description: 'Proof verification response'
});

export const FullCheckResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String({ description: 'Status message' }),
  job_id: Type.String({ description: 'Unique job identifier' }),
  status: Type.Literal('RUNNING', { description: 'Job status' })
}, {
  title: 'FullCheckResponse',
  description: 'Full integrity check start response'
});

export const PublicKeyResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    public_key: Type.String({ description: 'PEM-formatted public key' }),
    key_format: Type.Literal('PEM'),
    algorithm: Type.Literal('RS256'),
    usage: Type.String({ description: 'Key usage description' })
  })
}, {
  title: 'PublicKeyResponse',
  description: 'Public key response'
});

// Error response schema
export const ErrorResponseSchema = Type.Object({
  success: Type.Literal(false),
  error: Type.String({ description: 'Error message' }),
  code: Type.Optional(Type.String({ description: 'Error code' }))
}, {
  title: 'ErrorResponse',
  description: 'Standard error response'
});

// Route parameter schemas
export const AuditIdParamSchema = Type.Object({
  auditId: Type.String({
    description: 'UUID of the audit record',
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    examples: ['123e4567-e89b-12d3-a456-426614174000']
  })
}, {
  title: 'AuditIdParam',
  description: 'Audit record ID parameter'
});

// Common response examples
export const SecurityStatsExample = {
  success: true,
  data: {
    total_records: 15420,
    verified_records: 15418,
    unverified_records: 2,
    last_verification: '2024-01-15T10:30:45Z',
    integrity_score: 99.87
  }
};

export const TamperingDetectionExample = {
  success: true,
  data: {
    total_records: 1000,
    verified_records: 998,
    tampered_records: ['uuid1', 'uuid2'],
    integrity_score: 99.8,
    last_check: '2024-01-15T10:30:45Z'
  },
  alert: 'TAMPERING_DETECTED'
};

export const IntegrityProofExample = {
  success: true,
  data: {
    audit_id: '123e4567-e89b-12d3-a456-426614174000',
    integrity_proof: 'eyJyZWNvcmRfaWQiOiI...',
    generated_at: '2024-01-15T10:30:45Z',
    verification_instructions: 'Use POST /audit/integrity/verify-proof to verify this proof'
  }
};