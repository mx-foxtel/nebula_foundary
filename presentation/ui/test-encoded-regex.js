
const getYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

const encodedUrl = "https://storage.googleapis.com/https://www.youtube.com/watch%3Fv%3Dgg7WjuFs8F4?X-Goog-Algorithm=GOOG4-RSA-SHA256";
const decodedUrl = decodeURIComponent(encodedUrl);

console.log(`Encoded URL ID: ${getYouTubeId(encodedUrl)}`);
console.log(`Decoded URL ID: ${getYouTubeId(decodedUrl)}`);
