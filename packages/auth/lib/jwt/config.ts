export interface JwtConfig {
  secret: string;
  refreshSecret?: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
  issuer?: string;
  audience?: string;
}
