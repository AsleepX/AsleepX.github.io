// object-fit: contain leaves letterboxing inside the image element's CSS box.
export function containedPhotoRect(box, width, height) {
  if (!width || !height || !box.width || !box.height) return null;
  const scale = Math.min(box.width / width, box.height / height);
  const renderedWidth = width * scale, renderedHeight = height * scale;
  return {
    left:box.left+(box.width-renderedWidth)/2,
    top:box.top+(box.height-renderedHeight)/2,
    width:renderedWidth,height:renderedHeight,
  };
}

export function mapPhotoCat(source, target, cat) {
  if (!source.width || !target.width) return null;
  const scale = target.width / source.width;
  const visible = cat.left + cat.width > source.left && cat.left < source.left + source.width
    && cat.top + cat.height > source.top && cat.top < source.top + source.height;
  return {x:(cat.left-source.left)*scale,y:(cat.top-source.top)*scale,scale,visible};
}
