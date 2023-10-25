let currentImageIndex = 0;
const images = document.querySelectorAll('.anime-image');

function changeImage() {
    images[currentImageIndex].style.display = 'none'; // 隐藏当前图片
    currentImageIndex = (currentImageIndex + 1) % images.length; // 计算下一个图片的索引
    images[currentImageIndex].style.display = 'block'; // 显示下一个图片
}

// 初始显示第一张图片
images[0].style.display = 'block';

// 设置循环切换图片的间隔时间
setInterval(changeImage, 5000); // 每3秒切换一次图片
