import xss from 'xss';
export default function processXss(text: string) {
    return xss(text);
}
