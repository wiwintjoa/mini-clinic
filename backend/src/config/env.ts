import { plainToInstance, Type } from 'class-transformer';
import { IsInt, IsString, IsUrl, Min, MinLength, validateSync } from 'class-validator';

class Environment {
  @IsUrl({ require_tld: false, protocols: ['postgresql'] }) DATABASE_URL!: string;
  @IsString() @MinLength(32) JWT_SECRET!: string;
  @IsString() @MinLength(32) JWT_REFRESH_SECRET!: string;
  @IsString() JWT_EXPIRES_IN = '15m';
  @IsString() JWT_REFRESH_EXPIRES_IN = '7d';
  @IsString() CORS_ORIGIN = 'http://localhost:5173';
  @Type(() => Number) @IsInt() @Min(1) PORT = 3000;
  @IsString() NODE_ENV = 'development';
}

export function validateEnvironment(config: Record<string, unknown>) {
  const environment = plainToInstance(Environment, config, { enableImplicitConversion: true });
  const errors = validateSync(environment, { skipMissingProperties: false });
  if (errors.length) throw new Error(errors.toString());
  return environment;
}
