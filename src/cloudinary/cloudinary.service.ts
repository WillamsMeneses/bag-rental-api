import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  // Upload a file buffer to Cloudinary and return the secure URL
  async uploadImage(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: 'bag_rental' }, (error, result) => {
          if (error) return reject(new Error(error.message));
          if (!result) return reject(new Error('No result from Cloudinary'));
          resolve(result.secure_url);
        })
        .end(file.buffer);
    });
  }

  async uploadImages(files: Express.Multer.File[]): Promise<string[]> {
    return Promise.all(files.map((f) => this.uploadImage(f)));
  }

  // Extract public_id from Cloudinary URL including folder prefix
  extractPublicId(url: string): string {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    const relevantParts = parts.slice(uploadIndex + 2); // skip version segment
    const joined = relevantParts.join('/');
    return joined.replace(/\.[^/.]+$/, '');
  }

  async deleteImage(url: string): Promise<void> {
    const publicId = this.extractPublicId(url);
    await cloudinary.uploader.destroy(publicId);
  }

  async deleteImages(urls: string[]): Promise<void> {
    await Promise.all(urls.map((url) => this.deleteImage(url)));
  }
}
