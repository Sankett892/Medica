import { Request, Response, NextFunction } from 'express';
import { adminService } from './service.js';
import {
  surveillanceQuerySchema,
  facilitiesQuerySchema,
  auditQuerySchema,
  privacyThresholdSchema
} from './schema.js';

export async function getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await adminService.getOverview();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getSurveillance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = surveillanceQuerySchema.parse(req.query);
    const data = await adminService.getSurveillance(parsed);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getGeographic(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const k = req.query.k ? parseInt(req.query.k as string, 10) : undefined;
    const data = await adminService.getGeographic(k);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getFacilities(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = facilitiesQuerySchema.parse(req.query);
    const { facilities, meta } = await adminService.getFacilities(parsed);
    res.json({ data: facilities, meta });
  } catch (error) {
    next(error);
  }
}

export async function getPrivacy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const threshold = req.query.threshold ? parseInt(req.query.threshold as string, 10) : 5;
    const data = await adminService.getPrivacy(threshold);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getAudit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = auditQuerySchema.parse(req.query);
    const { events, meta } = await adminService.getAudit(parsed);
    res.json({ data: events, meta });
  } catch (error) {
    next(error);
  }
}

export async function getOrganizations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await adminService.getOrganizations();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getOrganizationById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await adminService.getOrganizationById(req.params.id as string);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await adminService.getUsers();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await adminService.getStatus();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await adminService.getSettings();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getPuneMap(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { diseaseCategory, locality, region, taluka, startDate, endDate, k } = req.query;
    const data = await adminService.getPuneIntelligenceMap({
      diseaseCategory: diseaseCategory ? String(diseaseCategory) : undefined,
      locality: locality ? String(locality) : undefined,
      region: (region || taluka) ? String(region || taluka) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      k: k ? parseInt(String(k), 10) : undefined
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getFollowUpAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await adminService.getFollowUpAnalytics();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

