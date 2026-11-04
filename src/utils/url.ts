export function getBaseUrl() {
    let base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.indiamorning.in";

    // Ensure the URL starts with https:// for production compatibility
    if (base && !base.startsWith("http")) {
        base = `https://${base}`;
    }

    return base.replace(/\/+$/, "");
}

export function getAbsoluteUrl(path: string) {
    const base = getBaseUrl();
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    if (path.startsWith("http")) return path;
    return `${base}${cleanPath}`;
}

export function getImageUrl(url?: string, absolute = false) {
    const defaultLogo = "/images/Indian-Morning-Logo.png";
    if (!url) return absolute ? getAbsoluteUrl(defaultLogo) : defaultLogo;
    
    if (url.startsWith("http")) return url;
    
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return absolute ? getAbsoluteUrl(cleanPath) : cleanPath;
}
// Example usage: