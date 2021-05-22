import { useStoreActions, useStoreState } from "easy-peasy";
import { motion } from "framer-motion";
import Link from "next/link";
import Close from "../assets/close";
import LeftArrowIcon from "../assets/left-arrow";
import EmptyGalleryIcon from "../assets/empty-gallery-icon";
import generatePdf from "../utils/generatePdf";
import { createRef, useRef, useState } from "react";
import PdfDoneIcon from "../assets/pdf-done-icon";
// Import Swiper React components
import SwiperCore, { Navigation, Thumbs } from "swiper/core";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/swiper.min.css";
import "swiper/components/navigation/navigation.min.css";
import "swiper/components/thumbs/thumbs.min.css";
import FilterSlider from "../components/filterSlider";
import ImageFilters from "canvas-filters";
import getOCR from "../utils/getOCR";
import { saveOcrFirebase } from "../hooks/useStorage";
import WhatsappLogo from "../assets/whatsapp-logo";

// import { Jimage } from "react-jimp";

SwiperCore.use([Navigation, Thumbs]);

const Gallery = () => {
  const canvasRef = useRef();
  const photoRef = useRef();
  const swiperRef = useRef();
  const { images } = useStoreState((state) => state);
  const { removeImage, removeAllImages, replaceImage } = useStoreActions(
    (action) => action
  );
  const [pdfGenerated, setPdfGenrated] = useState(false);
  const [thumbsSwiper, setThumbsSwiper] = useState();
  const [activeSlide, setActiveSlide] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [grayscale, setGrayscale] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const imageRefs = useRef([]);
  const [pdfRes, setPdfRes] = useState();

  if (imageRefs.current.length !== images.length) {
    // add or remove refs
    imageRefs.current = Array(images.length)
      .fill()
      .map((_, i) => imageRefs.current[i] || createRef());
  }

  const handleGeneratePdfFromImages = () => {
    const { pdfFile, pdfURL } = generatePdf(images);
    setPdfRes({ pdfFile, pdfURL });
    setPdfGenrated(true);
    cleanUpUploadedImages();
  };

  const handlePdfShare = (e) => {
    switch (e.target.id) {
      case "download": {
        downloadPdf();
        break;
      }
      default: {
        console.log("something went wrong :/");
      }
    }
  };

  const downloadPdf = () => {
    window.open(pdfRes.pdfURL, "_blank");
  };

  const handleOCR = async () => {
    let data = await getOCR(images);
    console.log("you", data);
    try {
      saveOcrFirebase(data);
    } catch (error) {
      console.log(error);
    }
    handleGeneratePdfFromImages();
  };

  const cleanUpUploadedImages = () => {
    images.forEach((image) => {
      URL.revokeObjectURL(image.src);
    });
    removeAllImages();
  };

  const setFilterToImage = (image) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const photo = photoRef.current;

    photo?.setAttribute("src", image.src);

    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(photo, 0, 0);
    const ImageData = context.getImageData(0, 0, image.width, image.height);
    const filtered = grayscale
      ? ImageFilters.GrayScale(
          ImageFilters.BrightnessContrastPhotoshop(
            ImageData,
            parseFloat(brightness),
            parseFloat(contrast)
          )
        )
      : ImageFilters.BrightnessContrastPhotoshop(
          ImageData,
          parseFloat(brightness),
          parseFloat(contrast)
        );
    context.putImageData(filtered, 0, 0);

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      replaceImage({ activeSlide, url });
      URL.revokeObjectURL(blob);
    });

    setBrightness(1);
    setContrast(1);
    setGrayscale(false);
  };

  return (
    <div className="h-screen bg-black">
      {/* BACK BUTTON */}
      <Link href="/scanner">
        <a>
          <motion.div
            key="back-button"
            initial={{ x: -200 }}
            animate={{ x: 0 }}
            transition={{
              type: "tween",
            }}
            exit={{
              x: -200,
            }}
            className="bg-gray-500 h-6 rounded-lg w-[5rem] sm:w-[7rem] absolute top-3 -left-4"
          >
            <div className="ml-7 sm:ml-10">
              <LeftArrowIcon />
            </div>
          </motion.div>
        </a>
      </Link>
      {images.length > 0 ? (
        <motion.div
          className="flex mt-12 flex-wrap flex-shrink justify-center"
          layoutId="gallery"
        >
          {/* MAIN CAROUSEL */}
          <Swiper
            style={{
              "--swiper-navigation-color": "#fff",
              "--swiper-pagination-color": "#fff",
            }}
            onSlideChange={(e) => setActiveSlide(e.activeIndex)}
            // loop={true}
            autoHeight={true}
            spaceBetween={10}
            navigation={true}
            thumbs={{ swiper: thumbsSwiper }}
            className="mySwiper2"
            ref={swiperRef}
            pagination={{ type: "fraction" }}
          >
            {images.map(({ src }, index) => (
              <SwiperSlide key={src}>
                <img
                  ref={imageRefs.current[index]}
                  style={{
                    filter: `brightness(${
                      (parseFloat(brightness) + 100) / 100
                    }) contrast(${
                      (parseFloat(contrast) + 100) / 100
                    }) grayscale(${grayscale ? 1 : 0})`,
                  }}
                  className={`py-3 px-2 max-h-[70vh] w-screen object-contain`}
                  src={src}
                />
              </SwiperSlide>
            ))}
          </Swiper>

          {/* SMALL CAROUSEL */}
          <Swiper
            onSwiper={setThumbsSwiper}
            spaceBetween={10}
            slidesPerView={4}
            // freeMode={true}
            watchSlidesVisibility={true}
            watchSlidesProgress={true}
            className="mySwiper"
            allowTouchMove={false}
          >
            {images.map(({ src }, index) => (
              <SwiperSlide key={src}>
                <img
                  ref={imageRefs.current[index]}
                  className={`py-3 px-2`}
                  src={src}
                />
              </SwiperSlide>
            ))}
          </Swiper>

          {/* BUTTONS */}
          {!isEditing && (
            <div className="flex justify-center">
              {images.length > 0 && (
                <button
                  key="pdf"
                  className="text-white border-2 border-white m-3 p-1"
                  onClick={handleGeneratePdfFromImages}
                >
                  GENERATE PDF
                </button>
              )}
              <button
                className="text-white border-2 border-white m-3 p-1"
                onClick={() => removeImage(activeSlide)}
              >
                Delete
                {/* <Close imageIndex={index} /> */}
              </button>
              <button
                className="text-white border-2 border-white m-3 p-1"
                onClick={() => {
                  setIsEditing(true);
                }}
              >
                Edit
                {/* <Close imageIndex={index} /> */}
              </button>
            </div>
          )}

          {/* SLIDERS */}
          {isEditing && (
            <div className="grid grid-cols-12 grid-rows-3 items-center w-full justify-center">
              <div className="col-span-2 text-white ml-2">Brightness:</div>
              <div className="col-start-4 col-span-7 row-span-1 my-[0.01rem] ml-2">
                <FilterSlider valueSetter={setBrightness} />
              </div>
              <div className="col-span-3 text-white ml-2">Contrast:</div>
              <div className="col-start-4 col-span-7 row-span-1 my-[0.01rem] ml-2">
                <FilterSlider valueSetter={setContrast} />
              </div>
              <div className="col-span-2 text-white ml-2">Grayscale</div>
              <div
                onClick={() => setGrayscale((grayscale) => !grayscale)}
                className="col-start-4 col-span-3 justify-self-start row-span-1 m-2 w-5 h-5 rounded-sm"
                style={{
                  backgroundColor: grayscale ? "rgb(100,255,0)" : "white",
                }}
              ></div>
              <div
                onClick={() => {
                  setFilterToImage(images[activeSlide]);
                  setIsEditing(false);
                }}
                className="col-start-11 col-span-2 row-span-full row-start-1 justify-self-center self-center align-middle"
              >
                <Close width={50} />
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        <div
          className="h-[90vh] w-screen flex justify-center items-center flex-col"
          style={{
            position: "absolute",
            top: "10%",
          }}
        >
          {pdfGenerated ? (
            <>
              <PdfDoneIcon />
              <div className="text-gray-300 text-center mt-3 px-3 sm:text-lg text-sm overflow-visible">
                <span className="text-xl font-bold">Done!</span>
                <br /> <div className="my-3">
                  Your pdf is generated
                </div> <br />{" "}
              </div>
              <div className="flex flex-col">
                <button className="border-white border-2 bg-[#4CAF50] rounded-lg p-2 text-white my-2">
                  <div className="flex justify-evenly">
                    <div>Share on</div>
                    <div className="h-[100%] w-[20%] mt-1">
                      <WhatsappLogo />
                    </div>
                  </div>
                </button>
                <button className="border-white border-2 bg-red-500 rounded-lg p-2 text-white my-2">
                  Copy URL
                </button>
                <button
                  id="download"
                  onClick={handlePdfShare}
                  className="border-white border-2 bg-primary rounded-lg p-2 text-white my-2"
                >
                  Download PDF
                </button>
              </div>
            </>
          ) : (
            <>
              <EmptyGalleryIcon />
              <div className="text-gray-300 text-center mt-3 px-3 sm:text-lg text-sm">
                Oops! looks like there are no images in your document right now,
                go back and click a few
              </div>
            </>
          )}
        </div>
      )}
      <canvas className="w-full hidden" ref={canvasRef}></canvas>
      <img className="hidden" ref={photoRef}></img>
    </div>
  );
};

export default Gallery;
