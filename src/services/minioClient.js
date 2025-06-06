import { Client } from 'minio'

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT,
  useSSL: true,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
  port: 443
})
