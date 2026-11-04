/**
 * Applies a watermark logo to the bottom-right corner of an image.
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

                // Set canvas to original image dimensions
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const logo = new Image();
                logo.crossOrigin = "anonymous";
                logo.onload = () => {
                    // Calculate watermark size: 15% of image width, min 40px, max 200px
                    let logoWidth = Math.max(40, Math.min(200, canvas.width * 0.15));
                    const logoHeight = (logo.height / logo.width) * logoWidth;

                    // Position: 2% padding from bottom-right
                    const padding = canvas.width * 0.02;
                    const x = canvas.width - logoWidth - padding;
                    const y = canvas.height - logoHeight - padding;

                    ctx.globalAlpha = 0.8;
                    ctx.drawImage(logo, x, y, logoWidth, logoHeight);
                    ctx.globalAlpha = 1.0;

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const fileName = file.name.replace(/\.[^/.]+$/, "") + "-watermarked.png";
                            resolve(new File([blob], fileName, { type: "image/png" }));
                        } else {
                            resolve(file);
                        }
                    }, "image/png");
                };
                logo.onerror = () => {
                    console.warn("Watermark logo failed to load, uploading original image.");
                    resolve(file);
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
