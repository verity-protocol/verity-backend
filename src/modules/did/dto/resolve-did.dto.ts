import { IsString, IsNotEmpty } from 'class-validator';

export class ResolveDidDto {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}
