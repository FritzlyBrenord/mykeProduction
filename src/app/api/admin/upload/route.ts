import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const folder = formData.get('folder') as string || 'general';
        const files = formData.getAll('file') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }

        const uploadPromises = files.map(async (file) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${crypto.randomUUID()}.${fileExt}`;
            const filePath = `${folder}/${fileName}`;

            const buffer = await file.arrayBuffer();

            // Déterminer le bucket basé sur le dossier
            let bucketName = 'images';
            if (folder === 'documents') {
                bucketName = 'documents';
            } else if (folder === 'videos') {
                bucketName = 'videos';
            }

            const { data, error } = await supabaseAdmin.storage
                .from(bucketName)
                .upload(filePath, buffer, {
                    contentType: file.type,
                    upsert: false
                });

            if (error) throw error;

            const { data: publicUrl } = supabaseAdmin.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            return publicUrl.publicUrl;
        });

        const urls = await Promise.all(uploadPromises);

        return NextResponse.json({ urls });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to upload files';
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload files', details: message },
            { status: 500 }
        );
    }
}
