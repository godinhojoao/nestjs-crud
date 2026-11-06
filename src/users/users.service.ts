import { Injectable, NotFoundException } from '@nestjs/common';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { randomUUID } from 'node:crypto';

export interface User {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
}

@Injectable()
export class UsersService {
  private readonly filePath = join(process.cwd(), 'data', 'users.json');

  private queue: Promise<unknown> = Promise.resolve();

  private async readUsers(): Promise<User[]> {
    return JSON.parse(await readFile(this.filePath, 'utf-8')) as User[];
  }

  private changeUsers<T>(change: (users: User[]) => T): Promise<T> {
    const result = this.queue.then(async () => {
      const users = await this.readUsers();
      const changed = change(users);
      await writeFile(this.filePath, JSON.stringify(users, null, 2));
      return changed;
    });
    this.queue = result.catch(() => undefined);
    return result;
  }

  private indexOf(users: User[], id: string): number {
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) {
      throw new NotFoundException(`Usuário ${id} não encontrado`);
    }
    return index;
  }

  async findAll(): Promise<User[]> {
    return this.readUsers();
  }

  async findOne(id: string): Promise<User> {
    const users = await this.readUsers();
    return users[this.indexOf(users, id)];
  }

  async create(dto: CreateUserDto): Promise<User> {
    return this.changeUsers((users) => {
      const user: User = {
        id: randomUUID(),
        nome: dto.nome,
        email: dto.email,
        ativo: true,
      };
      users.push(user);
      return user;
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    return this.changeUsers((users) => {
      const index = this.indexOf(users, id);
      users[index] = {
        id,
        nome: dto.nome,
        email: dto.email,
        ativo: dto.ativo,
      };
      return users[index];
    });
  }

  async patch(id: string, dto: Partial<UpdateUserDto>): Promise<User> {
    return this.changeUsers((users) => {
      const index = this.indexOf(users, id);
      users[index] = { ...users[index], ...dto, id };
      return users[index];
    });
  }

  async remove(id: string): Promise<void> {
    return this.changeUsers((users) => {
      users.splice(this.indexOf(users, id), 1);
    });
  }
}
