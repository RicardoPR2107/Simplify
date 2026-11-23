import type { Request, Response } from 'express';
import type { CategorySummaryQuery, PeriodQuery } from '@simplify/shared';
import type { SummaryService } from './summary.service.js';

export class SummaryController {
  constructor(private readonly summaries: SummaryService) {}

  month = async (req: Request, res: Response): Promise<void> => {
    const { year, month } = req.validated?.query as PeriodQuery;
    res.json(await this.summaries.month(req.userId!, year, month));
  };

  categories = async (req: Request, res: Response): Promise<void> => {
    const { year, month, type } = req.validated?.query as CategorySummaryQuery;
    res.json(await this.summaries.byCategory(req.userId!, year, month, type));
  };

  evolution = async (req: Request, res: Response): Promise<void> => {
    const { year, month } = req.validated?.query as PeriodQuery;
    res.json(await this.summaries.evolution(req.userId!, year, month));
  };
}
