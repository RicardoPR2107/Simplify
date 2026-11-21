import type { Request, Response } from 'express';
import type {
  CreateCategoryInput,
  DeleteCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from '@simplify/shared';
import type { CategoryService } from './category.service.js';

interface IdParams {
  id: string;
}

export class CategoryController {
  constructor(private readonly categories: CategoryService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const { type } = req.validated?.query as ListCategoriesQuery;
    res.json({ categories: await this.categories.list(req.userId!, type) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = req.validated?.body as CreateCategoryInput;
    res.status(201).json({ category: await this.categories.create(req.userId!, input) });
  };

  rename = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validated?.params as IdParams;
    const { name } = req.validated?.body as UpdateCategoryInput;
    res.json({ category: await this.categories.rename(req.userId!, id, name) });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validated?.params as IdParams;
    const { reassignTo } = req.validated?.query as DeleteCategoryInput;
    await this.categories.delete(req.userId!, id, reassignTo);
    res.status(204).end();
  };
}
