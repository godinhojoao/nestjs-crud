import { CreateUserDto } from './create-user.dto.js';

export class UpdateUserDto extends CreateUserDto {
  ativo: boolean;
}
