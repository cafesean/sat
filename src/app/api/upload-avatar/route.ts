import { uploadToS3 } from '@/lib/storage';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file')
  const userId = formData.get('userId')

  if (!file || typeof userId !== 'string' || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 })
  }

  const fileExt = file.name?.split('.').pop() || 'jpg'
  const fileName = `${userId}.${fileExt}`

  try {
    // Convert web File/Blob to Node.js Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { url } = await uploadToS3({
      file: buffer,
      fileName,
      folder: 'avatars'
    })
    return NextResponse.json({ url })
  } catch (err) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
