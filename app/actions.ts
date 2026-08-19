'use server';

import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export async function createUploadUrl() {
  const upload = await mux.video.uploads.create({
    new_asset_settings: {
      playback_policy: ['public'],
      video_quality: 'plus',
      mp4_support: 'standard',
      input: [
        {
            generated_subtitles: [
                { language_code: 'en', name: 'English (Auto)' }
            ]
        }
      ]
    },
    cors_origin: '*',
  });

  return upload;
}