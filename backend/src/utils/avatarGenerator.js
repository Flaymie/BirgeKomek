const SIZES = [100, 120, 140, 160, 180, 200];
const COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
  '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
  '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
  '#ff5722', '#795548', '#9e9e9e', '#607d8b'
];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const generateAvatar = (username) => {
  if (!username) return null;

  const initials = username.substring(0, 2).toUpperCase();
  const bgColor = getRandomElement(COLORS);
  const size = getRandomElement(SIZES);
  
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}" />
      <text 
        x="50%" 
        y="50%" 
        dy=".3em"
        font-family="Arial, sans-serif" 
        font-size="${size * 0.45}" 
        fill="#ffffff" 
        text-anchor="middle"
        font-weight="bold"
      >
        ${initials}
      </text>
    </svg>
  `;

  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  
  return dataUri;
}; 