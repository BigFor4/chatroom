const AvatarCount = 15;
const publicPath = process.env.PublicPath || '/';

export default function getRandomAvatar() {
    const number = Math.floor(Math.random() * AvatarCount);
    return `${publicPath}avatar/${number}.jpg`;
}

export function getDefaultAvatar() {
    return `${publicPath}avatar/0.jpg`;
}
