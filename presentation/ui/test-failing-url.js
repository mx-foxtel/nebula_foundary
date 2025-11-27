
const getYouTubeId = (url) => {
    try {
        const decodedUrl = decodeURIComponent(url);
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = decodedUrl.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    } catch (e) {
        return null;
    }
};

const failingUrl = "https://storage.googleapis.com/https://www.youtube.com/watch%3Fv%3DvsMydMDi3rI";
console.log(`Failing URL ID: ${getYouTubeId(failingUrl)}`);

const fullUrl = "https://storage.googleapis.com/https://www.youtube.com/watch%3Fv%3DvsMydMDi3rI?X-Goog-Algorithm=GOOG4-RSA-SHA256";
console.log(`Full URL ID: ${getYouTubeId(fullUrl)}`);
