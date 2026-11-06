import { Injectable, NotFoundException } from '@nestjs/common';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { randomUUID } from 'node:crypto';

export interface Task {
  id: string;
  descricao: string;
  inicio: number;
  fim: number;
  status: string;
  resultado: number[] | null;
}

@Injectable()
export class TasksService {
  private readonly filePath = join(process.cwd(), 'data', 'tasks.json');

  private queue: Promise<unknown> = Promise.resolve();

  private async readTasks(): Promise<Task[]> {
    return JSON.parse(await readFile(this.filePath, 'utf-8')) as Task[];
  }

  private changeTasks<T>(change: (tasks: Task[]) => T): Promise<T> {
    const result = this.queue.then(async () => {
      const tasks = await this.readTasks();
      const changed = change(tasks);
      await writeFile(this.filePath, JSON.stringify(tasks, null, 2));
      return changed;
    });
    this.queue = result.catch(() => undefined);
    return result;
  }

  private indexOf(tasks: Task[], id: string): number {
    const index = tasks.findIndex((task) => task.id === id);
    if (index === -1) {
      throw new NotFoundException(`Tarefa ${id} não encontrada`);
    }
    return index;
  }

  async findAll(): Promise<Task[]> {
    return this.readTasks();
  }

  async findOne(id: string): Promise<Task> {
    const tasks = await this.readTasks();
    return tasks[this.indexOf(tasks, id)];
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    return this.changeTasks((tasks) => {
      const task: Task = {
        id: randomUUID(),
        descricao: dto.descricao,
        inicio: dto.inicio,
        fim: dto.fim,
        status: 'PENDENTE',
        resultado: null,
      };
      tasks.push(task);
      return task;
    });
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    return this.changeTasks((tasks) => {
      const index = this.indexOf(tasks, id);
      tasks[index] = {
        id,
        descricao: dto.descricao,
        inicio: dto.inicio,
        fim: dto.fim,
        status: dto.status,
        resultado: dto.resultado,
      };
      return tasks[index];
    });
  }

  async patch(id: string, dto: Partial<UpdateTaskDto>): Promise<Task> {
    return this.changeTasks((tasks) => {
      const index = this.indexOf(tasks, id);
      tasks[index] = { ...tasks[index], ...dto, id };
      return tasks[index];
    });
  }

  async remove(id: string): Promise<void> {
    return this.changeTasks((tasks) => {
      tasks.splice(this.indexOf(tasks, id), 1);
    });
  }
}
