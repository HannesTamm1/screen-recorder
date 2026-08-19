'use client';

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createUploadUrl, getAssetIdFromUpload } from "@/app/actions";
import { Loader2, StopCircle, Monitor } from "lucide-react";

export default function ScreenRecorder(){
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const liveVideoRef = useRef<HTMLVideoElement>(null);

    const router = useRouter();

    const startRecording = async () => {
        try {

            // capture screen
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false,
            });
            //capture mic
            const micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                },
                video: false,
            });
            //cleanup refrences
            screenStreamRef.current = screenStream;
            micStreamRef.current = micStream;


            const combinedStream = new MediaStream([
                ...screenStream.getVideoTracks(),
                ...micStream.getAudioTracks(),
            ]);


            //Live preview
            if (liveVideoRef.current) {
                liveVideoRef.current.srcObject = combinedStream;
            }

            const mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: 'video/webm; codecs=vp9'
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunksRef.current.push(event.data);
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                setMediaBlob(blob);

                if (liveVideoRef.current) {
                    liveVideoRef.current.srcObject = null;
                }


                screenStreamRef.current?.getTracks().forEach(t => t.stop());
                micStreamRef.current?.getTracks().forEach(t => t.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);

            screenStream.getVideoTracks()[0].onended = stopRecording;

        }  catch (err) {
            console.error('Error starting recording', err);
        }
    };
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleUpload = async () => {
        if (!mediaBlob) return;

        setIsUploading(true);

        try {

            const uploadConfig = await createUploadUrl();


            await fetch(uploadConfig.url, { 
                method: 'PUT', 
                body: mediaBlob 
            });

            // Step 3: Poll until processing completes
            while (true) {
                const result = await getAssetIdFromUpload(uploadConfig.id);
                if (result.playbackId) {
                    router.push(`/video/${result.playbackId}`);
                    break;
                }
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (err) {
            console.error('Upload failed', err);
            setIsUploading(false);
        }
    };

}