/**
 * Applies a watermark logo to the bottom-right corner of an image.
 * Also performs "Smart Compression" to target < 300KB for WhatsApp mobile compatibility.
 * Runs in the browser using HTML5 Canvas.
 */
export async function applyWatermark(file: File): Promise<File> {
    // If not an image, return as is
    if (!file.type.startsWith("image/")) return file;

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    resolve(file);
                    return;
                }

                const targetWidth = 1200;
                const targetHeight = 630;
                canvas.width = targetWidth;
                canvas.height = targetHeight;

                // Create a "cover" fit for the image on the canvas
                const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
                const w = img.width * scale;
                const h = img.height * scale;
                const offsetX = (targetWidth - w) / 2;
                const offsetY = (targetHeight - h) / 2;

                ctx.drawImage(img, offsetX, offsetY, w, h);

                const logo = new Image();
                logo.crossOrigin = "anonymous";
                logo.onload = () => {
                    const logoWidth = Math.max(50, Math.min(120, targetWidth * 0.08));
                    const logoHeight = (logo.height / logo.width) * logoWidth;
                    const padding = 25;
                    const lx = targetWidth - logoWidth - padding;
                    const ly = targetHeight - logoHeight - padding;

                    ctx.globalAlpha = 0.8;
                    ctx.drawImage(logo, lx, ly, logoWidth, logoHeight);
                    ctx.globalAlpha = 1.0;

                    const fileName = file.name.replace(/\.[^/.]+$/, "") + "-watermarked.jpg";

                    // Smart Compression Loop: Target < 300KB
                    const compress = (quality: number) => {
                        canvas.toBlob((blob) => {
                            if (blob) {
                                // If still over 300KB and quality is high, try compressing more
                                if (blob.size > 300 * 1024 && quality > 0.4) {
                                    compress(quality - 0.1);
                                } else {
                                    resolve(new File([blob], fileName, { type: "image/jpeg" }));
                                }
                            } else {
                                resolve(file);
                            }
                        }, "image/jpeg", quality);
                    };

                    compress(0.85); // Start with 85% quality
                };
                logo.onerror = () => {
                    console.warn("Watermark logo failed to load, uploading resized image.");
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const fileName = file.name.replace(/\.[^/.]+$/, "") + "-resized.jpg";
                            resolve(new File([blob], fileName, { type: "image/jpeg" }));
                        } else {
                            resolve(file);
                        }
                    }, "image/jpeg", 0.8);
                };
                logo.src = "/images/Indian-Morning-Logo.png";
            };
            img.onerror = () => resolve(file);
            img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}
