/**
 * Geo-blocking Middleware
 * Blocks requests from restricted jurisdictions
 */

import { Request, Response, NextFunction } from 'express';
import geoip from 'geoip-lite';

// Restricted country codes (example: US, North Korea, Iran, etc.)
const RESTRICTED_COUNTRIES = ['US', 'KP', 'IR', 'SY', 'CU'];

export const geoBlockMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip geo-blocking in development
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // Get IP address
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
  const clientIp = ip.split(',')[0].trim();

  // Lookup geo location
  const geo = geoip.lookup(clientIp);

  if (geo && RESTRICTED_COUNTRIES.includes(geo.country)) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'This service is not available in your region due to regulatory restrictions.',
      country: geo.country,
    });
  }

  next();
};
