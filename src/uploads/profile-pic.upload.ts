import multer from 'multer';
import { diskStorage, mimeFilter } from '../config/multer.js';

/**
 * Handles profile picture uploads.
 * - Destination: uploads/users/profile-pics/
 * - Allowed types: JPEG, PNG
 * - Max size: 5 MB
 * - Form-data field name: "file"
 */
export const uploadProfilePic = multer({
  storage: diskStorage('uploads/users/profile-pics'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: mimeFilter(['image/jpeg', 'image/png']),
}).single('file');
