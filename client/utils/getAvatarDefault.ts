const publicPath = process.env.PublicPath || '/';
export default function getAvatarDefault() {
    return `${publicPath}avatar/default.png`;
}
export function getDefaultAvatar() {
    return `${publicPath}avatar/default.png`;
}
