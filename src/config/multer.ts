import multer from 'multer';
import path from 'path';
import { randomBytes } from 'crypto';
import type { Request } from 'express';

/**
 * Creates a disk storage engine for the given destination folder.
 * Filenames are 16-byte hex strings with the original extension.
 */
export function diskStorage(destination: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.resolve(destination)),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${randomBytes(16).toString('hex')}${ext}`);
    },
  });
}

/**
 * Creates a multer fileFilter that only allows the specified MIME types.
 */
export function mimeFilter(allowed: string[]) {
  const set = new Set(allowed);
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (set.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowed.join(', ')}.`));
    }
  };
}
