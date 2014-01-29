(function (window, document) {
  window.lightTable = window.lightTable || {
    getPalette: function(sourceImage, colorCount, quality) {
      /*
       * Color Thief v2.0
       * by Lokesh Dhakar - http://www.lokeshdhakar.com
       *
       * colorCount determines the size of the palette; the number of colors returned. If not set, it
       * defaults to 10.
       * quality is an optional argument. It needs to be an integer. 0 is the highest quality settings.
       * 10 is the default. There is a trade-off between quality and speed. The bigger the number, the
       * faster the palette generation but the greater the likelihood that colors will be missed.
      */
      if (typeof colorCount === 'undefined') {
        colorCount = 10;
      }
      if (typeof quality === 'undefined') {
        quality = 10;
      }

      // Create custom CanvasImage object
      var image      = new CanvasImage(sourceImage);
      var imageData  = image.getImageData();
      var pixels     = imageData.data;
      var pixelCount = image.getPixelCount();

      // Store the RGB values in an array format suitable for quantize function
      var pixelArray = [];
      for (var i = 0, offset, r, g, b, a; i < pixelCount; i = i + quality) {
        offset = i * 4;
        r = pixels[offset + 0];
        g = pixels[offset + 1];
        b = pixels[offset + 2];
        a = pixels[offset + 3];
        // If pixel is mostly opaque and not white
        if (a >= 125) {
          if (!(r > 250 && g > 250 && b > 250)) {
            pixelArray.push([r, g, b]);
          }
        }
      }

      // Send array to quantize function which clusters values
      // using median cut algorithm
      var cmap    = MMCQ.quantize(pixelArray, colorCount);
      var palette = cmap.palette();

      // Clean up
      image.removeCanvas();

      return palette;
    },
    getEXIF: (function() {

      var debug = false;

      var ExifTags = {

          // version tags
          0x9000 : "ExifVersion",     // EXIF version
          0xA000 : "FlashpixVersion",   // Flashpix format version

          // colorspace tags
          0xA001 : "ColorSpace",      // Color space information tag

          // image configuration
          0xA002 : "PixelXDimension",   // Valid width of meaningful image
          0xA003 : "PixelYDimension",   // Valid height of meaningful image
          0x9101 : "ComponentsConfiguration", // Information about channels
          0x9102 : "CompressedBitsPerPixel",  // Compressed bits per pixel

          // user information
          0x927C : "MakerNote",     // Any desired information written by the manufacturer
          0x9286 : "UserComment",     // Comments by user

          // related file
          0xA004 : "RelatedSoundFile",    // Name of related sound file

          // date and time
          0x9003 : "DateTimeOriginal",    // Date and time when the original image was generated
          0x9004 : "DateTimeDigitized",   // Date and time when the image was stored digitally
          0x9290 : "SubsecTime",      // Fractions of seconds for DateTime
          0x9291 : "SubsecTimeOriginal",    // Fractions of seconds for DateTimeOriginal
          0x9292 : "SubsecTimeDigitized",   // Fractions of seconds for DateTimeDigitized

          // picture-taking conditions
          0x829A : "ExposureTime",    // Exposure time (in seconds)
          0x829D : "FNumber",     // F number
          0x8822 : "ExposureProgram",   // Exposure program
          0x8824 : "SpectralSensitivity",   // Spectral sensitivity
          0x8827 : "ISOSpeedRatings",   // ISO speed rating
          0x8828 : "OECF",      // Optoelectric conversion factor
          0x9201 : "ShutterSpeedValue",   // Shutter speed
          0x9202 : "ApertureValue",   // Lens aperture
          0x9203 : "BrightnessValue",   // Value of brightness
          0x9204 : "ExposureBias",    // Exposure bias
          0x9205 : "MaxApertureValue",    // Smallest F number of lens
          0x9206 : "SubjectDistance",   // Distance to subject in meters
          0x9207 : "MeteringMode",    // Metering mode
          0x9208 : "LightSource",     // Kind of light source
          0x9209 : "Flash",     // Flash status
          0x9214 : "SubjectArea",     // Location and area of main subject
          0x920A : "FocalLength",     // Focal length of the lens in mm
          0xA20B : "FlashEnergy",     // Strobe energy in BCPS
          0xA20C : "SpatialFrequencyResponse",  // 
          0xA20E : "FocalPlaneXResolution",   // Number of pixels in width direction per FocalPlaneResolutionUnit
          0xA20F : "FocalPlaneYResolution",   // Number of pixels in height direction per FocalPlaneResolutionUnit
          0xA210 : "FocalPlaneResolutionUnit",  // Unit for measuring FocalPlaneXResolution and FocalPlaneYResolution
          0xA214 : "SubjectLocation",   // Location of subject in image
          0xA215 : "ExposureIndex",   // Exposure index selected on camera
          0xA217 : "SensingMethod",     // Image sensor type
          0xA300 : "FileSource",      // Image source (3 == DSC)
          0xA301 : "SceneType",       // Scene type (1 == directly photographed)
          0xA302 : "CFAPattern",      // Color filter array geometric pattern
          0xA401 : "CustomRendered",    // Special processing
          0xA402 : "ExposureMode",    // Exposure mode
          0xA403 : "WhiteBalance",    // 1 = auto white balance, 2 = manual
          0xA404 : "DigitalZoomRation",   // Digital zoom ratio
          0xA405 : "FocalLengthIn35mmFilm", // Equivalent foacl length assuming 35mm film camera (in mm)
          0xA406 : "SceneCaptureType",    // Type of scene
          0xA407 : "GainControl",     // Degree of overall image gain adjustment
          0xA408 : "Contrast",      // Direction of contrast processing applied by camera
          0xA409 : "Saturation",      // Direction of saturation processing applied by camera
          0xA40A : "Sharpness",     // Direction of sharpness processing applied by camera
          0xA40B : "DeviceSettingDescription",  // 
          0xA40C : "SubjectDistanceRange",  // Distance to subject

          // other tags
          0xA005 : "InteroperabilityIFDPointer",
          0xA420 : "ImageUniqueID"    // Identifier assigned uniquely to each image
      };

      var TiffTags = {
          0x0100 : "ImageWidth",
          0x0101 : "ImageHeight",
          0x8769 : "ExifIFDPointer",
          0x8825 : "GPSInfoIFDPointer",
          0xA005 : "InteroperabilityIFDPointer",
          0x0102 : "BitsPerSample",
          0x0103 : "Compression",
          0x0106 : "PhotometricInterpretation",
          0x0112 : "Orientation",
          0x0115 : "SamplesPerPixel",
          0x011C : "PlanarConfiguration",
          0x0212 : "YCbCrSubSampling",
          0x0213 : "YCbCrPositioning",
          0x011A : "XResolution",
          0x011B : "YResolution",
          0x0128 : "ResolutionUnit",
          0x0111 : "StripOffsets",
          0x0116 : "RowsPerStrip",
          0x0117 : "StripByteCounts",
          0x0201 : "JPEGInterchangeFormat",
          0x0202 : "JPEGInterchangeFormatLength",
          0x012D : "TransferFunction",
          0x013E : "WhitePoint",
          0x013F : "PrimaryChromaticities",
          0x0211 : "YCbCrCoefficients",
          0x0214 : "ReferenceBlackWhite",
          0x0132 : "DateTime",
          0x010E : "ImageDescription",
          0x010F : "Make",
          0x0110 : "Model",
          0x0131 : "Software",
          0x013B : "Artist",
          0x8298 : "Copyright"
      };

      var GPSTags = {
          0x0000 : "GPSVersionID",
          0x0001 : "GPSLatitudeRef",
          0x0002 : "GPSLatitude",
          0x0003 : "GPSLongitudeRef",
          0x0004 : "GPSLongitude",
          0x0005 : "GPSAltitudeRef",
          0x0006 : "GPSAltitude",
          0x0007 : "GPSTimeStamp",
          0x0008 : "GPSSatellites",
          0x0009 : "GPSStatus",
          0x000A : "GPSMeasureMode",
          0x000B : "GPSDOP",
          0x000C : "GPSSpeedRef",
          0x000D : "GPSSpeed",
          0x000E : "GPSTrackRef",
          0x000F : "GPSTrack",
          0x0010 : "GPSImgDirectionRef",
          0x0011 : "GPSImgDirection",
          0x0012 : "GPSMapDatum",
          0x0013 : "GPSDestLatitudeRef",
          0x0014 : "GPSDestLatitude",
          0x0015 : "GPSDestLongitudeRef",
          0x0016 : "GPSDestLongitude",
          0x0017 : "GPSDestBearingRef",
          0x0018 : "GPSDestBearing",
          0x0019 : "GPSDestDistanceRef",
          0x001A : "GPSDestDistance",
          0x001B : "GPSProcessingMethod",
          0x001C : "GPSAreaInformation",
          0x001D : "GPSDateStamp",
          0x001E : "GPSDifferential"
      };

      var StringValues = {
          ExposureProgram : {
              0 : "Not defined",
              1 : "Manual",
              2 : "Normal program",
              3 : "Aperture priority",
              4 : "Shutter priority",
              5 : "Creative program",
              6 : "Action program",
              7 : "Portrait mode",
              8 : "Landscape mode"
          },
          MeteringMode : {
              0 : "Unknown",
              1 : "Average",
              2 : "CenterWeightedAverage",
              3 : "Spot",
              4 : "MultiSpot",
              5 : "Pattern",
              6 : "Partial",
              255 : "Other"
          },
          LightSource : {
              0 : "Unknown",
              1 : "Daylight",
              2 : "Fluorescent",
              3 : "Tungsten (incandescent light)",
              4 : "Flash",
              9 : "Fine weather",
              10 : "Cloudy weather",
              11 : "Shade",
              12 : "Daylight fluorescent (D 5700 - 7100K)",
              13 : "Day white fluorescent (N 4600 - 5400K)",
              14 : "Cool white fluorescent (W 3900 - 4500K)",
              15 : "White fluorescent (WW 3200 - 3700K)",
              17 : "Standard light A",
              18 : "Standard light B",
              19 : "Standard light C",
              20 : "D55",
              21 : "D65",
              22 : "D75",
              23 : "D50",
              24 : "ISO studio tungsten",
              255 : "Other"
          },
          Flash : {
              0x0000 : "Flash did not fire",
              0x0001 : "Flash fired",
              0x0005 : "Strobe return light not detected",
              0x0007 : "Strobe return light detected",
              0x0009 : "Flash fired, compulsory flash mode",
              0x000D : "Flash fired, compulsory flash mode, return light not detected",
              0x000F : "Flash fired, compulsory flash mode, return light detected",
              0x0010 : "Flash did not fire, compulsory flash mode",
              0x0018 : "Flash did not fire, auto mode",
              0x0019 : "Flash fired, auto mode",
              0x001D : "Flash fired, auto mode, return light not detected",
              0x001F : "Flash fired, auto mode, return light detected",
              0x0020 : "No flash function",
              0x0041 : "Flash fired, red-eye reduction mode",
              0x0045 : "Flash fired, red-eye reduction mode, return light not detected",
              0x0047 : "Flash fired, red-eye reduction mode, return light detected",
              0x0049 : "Flash fired, compulsory flash mode, red-eye reduction mode",
              0x004D : "Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected",
              0x004F : "Flash fired, compulsory flash mode, red-eye reduction mode, return light detected",
              0x0059 : "Flash fired, auto mode, red-eye reduction mode",
              0x005D : "Flash fired, auto mode, return light not detected, red-eye reduction mode",
              0x005F : "Flash fired, auto mode, return light detected, red-eye reduction mode"
          },
          SensingMethod : {
              1 : "Not defined",
              2 : "One-chip color area sensor",
              3 : "Two-chip color area sensor",
              4 : "Three-chip color area sensor",
              5 : "Color sequential area sensor",
              7 : "Trilinear sensor",
              8 : "Color sequential linear sensor"
          },
          SceneCaptureType : {
              0 : "Standard",
              1 : "Landscape",
              2 : "Portrait",
              3 : "Night scene"
          },
          SceneType : {
              1 : "Directly photographed"
          },
          CustomRendered : {
              0 : "Normal process",
              1 : "Custom process"
          },
          WhiteBalance : {
              0 : "Auto white balance",
              1 : "Manual white balance"
          },
          GainControl : {
              0 : "None",
              1 : "Low gain up",
              2 : "High gain up",
              3 : "Low gain down",
              4 : "High gain down"
          },
          Contrast : {
              0 : "Normal",
              1 : "Soft",
              2 : "Hard"
          },
          Saturation : {
              0 : "Normal",
              1 : "Low saturation",
              2 : "High saturation"
          },
          Sharpness : {
              0 : "Normal",
              1 : "Soft",
              2 : "Hard"
          },
          SubjectDistanceRange : {
              0 : "Unknown",
              1 : "Macro",
              2 : "Close view",
              3 : "Distant view"
          },
          FileSource : {
              3 : "DSC"
          },

          Components : {
              0 : "",
              1 : "Y",
              2 : "Cb",
              3 : "Cr",
              4 : "R",
              5 : "G",
              6 : "B"
          }
      };

      function addEvent(element, event, handler) {
          if (element.addEventListener) { 
              element.addEventListener(event, handler, false); 
          } else if (element.attachEvent) { 
              element.attachEvent("on" + event, handler); 
          }
      }

      function imageHasData(img) {
          return !!(img.exifdata);
      }

      function getImageData(img, callback) {
          function handleBinaryFile(binFile) {
              var data = findEXIFinJPEG(binFile);
              img.exifdata = data || {};
              if (callback) {
                  callback.call(img);
              }
          }

          if (img instanceof Image) {
              BinaryAjax(img.src, function(http) {
                  handleBinaryFile(http.binaryResponse);
              });
          } else if (window.FileReader && img instanceof window.File) {
              var fileReader = new FileReader();

              fileReader.onload = function(e) {
                  handleBinaryFile(new BinaryFile(e.target.result));
              };

              fileReader.readAsBinaryString(img);
          }
      }

      function findEXIFinJPEG(file) {
          if (file.getByteAt(0) != 0xFF || file.getByteAt(1) != 0xD8) {
              return false; // not a valid jpeg
          }

          var offset = 2,
              length = file.getLength(),
              marker;

          while (offset < length) {
              if (file.getByteAt(offset) != 0xFF) {
                  if (debug) console.log("Not a valid marker at offset " + offset + ", found: " + file.getByteAt(offset));
                  return false; // not a valid marker, something is wrong
              }

              marker = file.getByteAt(offset+1);

              // we could implement handling for other markers here, 
              // but we're only looking for 0xFFE1 for EXIF data

              if (marker == 22400) {
                  if (debug) console.log("Found 0xFFE1 marker");
                  
                  return readEXIFData(file, offset + 4, file.getShortAt(offset+2, true)-2);
                  
                  // offset += 2 + file.getShortAt(offset+2, true);

              } else if (marker == 225) {
                  // 0xE1 = Application-specific 1 (for EXIF)
                  if (debug) console.log("Found 0xFFE1 marker");
                  
                  return readEXIFData(file, offset + 4, file.getShortAt(offset+2, true)-2);

              } else {
                  offset += 2 + file.getShortAt(offset+2, true);
              }

          }

      }


      function readTags(file, tiffStart, dirStart, strings, bigEnd) {
          var entries = file.getShortAt(dirStart, bigEnd),
              tags = {}, 
              entryOffset, tag,
              i;
              
          for (i=0;i<entries;i++) {
              entryOffset = dirStart + i*12 + 2;
              tag = strings[file.getShortAt(entryOffset, bigEnd)];
              if (!tag && debug) console.log("Unknown tag: " + file.getShortAt(entryOffset, bigEnd));
              tags[tag] = readTagValue(file, entryOffset, tiffStart, dirStart, bigEnd);
          }
          return tags;
      }


      function readTagValue(file, entryOffset, tiffStart, dirStart, bigEnd) {
          var type = file.getShortAt(entryOffset+2, bigEnd),
              numValues = file.getLongAt(entryOffset+4, bigEnd),
              valueOffset = file.getLongAt(entryOffset+8, bigEnd) + tiffStart,
              offset,
              vals, val, n,
              numerator, denominator;

          switch (type) {
              case 1: // byte, 8-bit unsigned int
              case 7: // undefined, 8-bit byte, value depending on field
                  if (numValues == 1) {
                      return file.getByteAt(entryOffset + 8, bigEnd);
                  } else {
                      offset = numValues > 4 ? valueOffset : (entryOffset + 8);
                      vals = [];
                      for (n=0;n<numValues;n++) {
                          vals[n] = file.getByteAt(offset + n);
                      }
                      return vals;
                  }
                  break;
              case 2: // ascii, 8-bit byte
                  offset = numValues > 4 ? valueOffset : (entryOffset + 8);
                  return file.getStringAt(offset, numValues-1);

              case 3: // short, 16 bit int
                  if (numValues == 1) {
                      return file.getShortAt(entryOffset + 8, bigEnd);
                  } else {
                      offset = numValues > 2 ? valueOffset : (entryOffset + 8);
                      vals = [];
                      for (n=0;n<numValues;n++) {
                          vals[n] = file.getShortAt(offset + 2*n, bigEnd);
                      }
                      return vals;
                  }
                  break;
              case 4: // long, 32 bit int
                  if (numValues == 1) {
                      return file.getLongAt(entryOffset + 8, bigEnd);
                  } else {
                      vals = [];
                      for (n=0;n<numValues;n++) {
                          vals[n] = file.getLongAt(valueOffset + 4*n, bigEnd);
                      }
                      return vals;
                  }
                  break;
              case 5: // rational = two long values, first is numerator, second is denominator
                  if (numValues == 1) {
                      numerator = file.getLongAt(valueOffset, bigEnd);
                      denominator = file.getLongAt(valueOffset+4, bigEnd);
                      val = new Number(numerator / denominator);
                      val.numerator = numerator;
                      val.denominator = denominator;
                      return val;
                  } else {
                      vals = [];
                      for (n=0;n<numValues;n++) {
                          numerator = file.getLongAt(valueOffset + 8*n, bigEnd);
                          denominator = file.getLongAt(valueOffset+4 + 8*n, bigEnd);
                          vals[n] = new Number(numerator / denominator);
                          vals[n].numerator = numerator;
                          vals[n].denominator = denominator;
                      }
                      return vals;
                  }
                  break;
              case 9: // slong, 32 bit signed int
                  if (numValues == 1) {
                      return file.getSLongAt(entryOffset + 8, bigEnd);
                  } else {
                      vals = [];
                      for (n=0;n<numValues;n++) {
                          vals[n] = file.getSLongAt(valueOffset + 4*n, bigEnd);
                      }
                      return vals;
                  }
                  break;
              case 10: // signed rational, two slongs, first is numerator, second is denominator
                  if (numValues == 1) {
                      return file.getSLongAt(valueOffset, bigEnd) / file.getSLongAt(valueOffset+4, bigEnd);
                  } else {
                      vals = [];
                      for (n=0;n<numValues;n++) {
                          vals[n] = file.getSLongAt(valueOffset + 8*n, bigEnd) / file.getSLongAt(valueOffset+4 + 8*n, bigEnd);
                      }
                      return vals;
                  }
          }
      }


      function readEXIFData(file, start) {
          if (file.getStringAt(start, 4) != "Exif") {
              if (debug) console.log("Not valid EXIF data! " + file.getStringAt(start, 4));
              return false;
          }

          var bigEnd,
              tags, tag,
              exifData, gpsData,
              tiffOffset = start + 6;

          // test for TIFF validity and endianness
          if (file.getShortAt(tiffOffset) == 0x4949) {
              bigEnd = false;
          } else if (file.getShortAt(tiffOffset) == 0x4D4D) {
              bigEnd = true;
          } else {
              if (debug) console.log("Not valid TIFF data! (no 0x4949 or 0x4D4D)");
              return false;
          }

          if (file.getShortAt(tiffOffset+2, bigEnd) != 0x002A) {
              if (debug) console.log("Not valid TIFF data! (no 0x002A)");
              return false;
          }

          if (file.getLongAt(tiffOffset+4, bigEnd) != 0x00000008) {
              if (debug) console.log("Not valid TIFF data! (First offset not 8)", file.getShortAt(tiffOffset+4, bigEnd));
              return false;
          }

          tags = readTags(file, tiffOffset, tiffOffset+8, TiffTags, bigEnd);

          if (tags.ExifIFDPointer) {
              exifData = readTags(file, tiffOffset, tiffOffset + tags.ExifIFDPointer, ExifTags, bigEnd);
              for (tag in exifData) {
                  switch (tag) {
                      case "LightSource" :
                      case "Flash" :
                      case "MeteringMode" :
                      case "ExposureProgram" :
                      case "SensingMethod" :
                      case "SceneCaptureType" :
                      case "SceneType" :
                      case "CustomRendered" :
                      case "WhiteBalance" : 
                      case "GainControl" : 
                      case "Contrast" :
                      case "Saturation" :
                      case "Sharpness" : 
                      case "SubjectDistanceRange" :
                      case "FileSource" :
                          exifData[tag] = StringValues[tag][exifData[tag]];
                          break;
          
                      case "ExifVersion" :
                      case "FlashpixVersion" :
                          exifData[tag] = String.fromCharCode(exifData[tag][0], exifData[tag][1], exifData[tag][2], exifData[tag][3]);
                          break;
          
                      case "ComponentsConfiguration" : 
                          exifData[tag] = 
                              StringValues.Components[exifData[tag][0]] + StringValues.Components[exifData[tag][1]] + StringValues.Components[exifData[tag][2]] + StringValues.Components[exifData[tag][3]];
                          break;
                  }
                  tags[tag] = exifData[tag];
              }
          }

          if (tags.GPSInfoIFDPointer) {
              gpsData = readTags(file, tiffOffset, tiffOffset + tags.GPSInfoIFDPointer, GPSTags, bigEnd);
              for (tag in gpsData) {
                  switch (tag) {
                      case "GPSVersionID" : 
                          gpsData[tag] = gpsData[tag][0] + "." + gpsData[tag][1] + "." + gpsData[tag][2] + "." + gpsData[tag][3];
                          break;
                  }
                  tags[tag] = gpsData[tag];
              }
          }

          return tags;
      }


      function getData(img, callback) {
          if (img instanceof Image && !img.complete) return false;
          if (!imageHasData(img)) {
              getImageData(img, callback);
          } else {
              if (callback) {
                  callback.call(img);
              }
          }
          return true;
      }

      function getTag(img, tag) {
          if (!imageHasData(img)) return;
          return img.exifdata[tag];
      }

      function getAllTags(img) {
          if (!imageHasData(img)) return {};
          var a, 
              data = img.exifdata,
              tags = {};
          for (a in data) {
              if (data.hasOwnProperty(a)) {
                  tags[a] = data[a];
              }
          }
          return tags;
      }

      function pretty(img) {
          if (!imageHasData(img)) return "";
          var a,
              data = img.exifdata,
              strPretty = "";
          for (a in data) {
              if (data.hasOwnProperty(a)) {
                  if (typeof data[a] == "object") {
                      if (data[a] instanceof Number) {
                          strPretty += a + " : " + data[a] + " [" + data[a].numerator + "/" + data[a].denominator + "]\r\n";
                      } else {
                          strPretty += a + " : [" + data[a].length + " values]\r\n";
                      }
                  } else {
                      strPretty += a + " : " + data[a] + "\r\n";
                  }
              }
          }
          return strPretty;
      }

      function readFromBinaryFile(file) {
          return findEXIFinJPEG(file);
      }

     
      return {
          readFromBinaryFile : readFromBinaryFile,
          pretty : pretty,
          tag : getTag,
          allTags : getAllTags,
          data : getData,
          Tags : ExifTags,
          TiffTags : TiffTags,
          GPSTags : GPSTags,
          StringValues : StringValues
      };

    })(),
    getIPTC: function(img, callback) {
      // This is very buggy right now, a bit unreliable as to what it can return
      var bDebug = false;
      var fieldMap = {
        120 : 'caption',
        110 : 'credit',
        25 : 'keywords',
        85 : 'byline',
        122 : 'captionWriter',
        105 : 'headline',
        116 : 'copyright',
        15 : 'category'
      };
      if (img instanceof Image && !img.complete) return false;
      if (!imageHasData(img)) {
          getImageData(img, callback);
      } else {
        if (callback) {
          callback.call(img);
        }
      }
      function imageHasData(img) {
        return !!(img.exifdata);
      }
      function getImageData(img, callback) {
        function handleBinaryFile(binFile) {
          var data = findIPTCinJPEG(binFile);
          iptcData = data || {};
          if (callback) {
            callback.call(iptcData);
          }
        }
        if (img instanceof Image) {
          BinaryAjax(img.src, function(http) {
            handleBinaryFile(http.binaryResponse);
          });
        } else if (window.FileReader && img instanceof window.File) {
          var fileReader = new FileReader();
          fileReader.onload = function(e) {
            handleBinaryFile(new BinaryFile(e.target.result));
          };
          fileReader.readAsBinaryString(img);
        }
      }
      function readIPTCData(oFile, iStart, iLength) {
        var data = {};
        if (oFile.getStringAt(iStart, 9) != "Photoshop") {
          if (bDebug) log("Not valid Photoshop data! " + oFile.getStringAt(iStart, 9));
          return false;
        }
        var length, offset, fieldStart, title, value,
          fileLength = oFile.getLength(),
          FILE_SEPARATOR_CHAR = 28,
          START_OF_TEXT_CHAR = 2;

        for (var i = 0; i < iLength; i++) {
          fieldStart = iStart + i;
          if(oFile.getByteAt(fieldStart) == START_OF_TEXT_CHAR && oFile.getByteAt(fieldStart + 1) in fieldMap) {
            length = 0;
            offset = 2;
            while(
                fieldStart + offset < fileLength &&
                oFile.getByteAt(fieldStart + offset) != FILE_SEPARATOR_CHAR &&
                oFile.getByteAt(fieldStart + offset + 1) != START_OF_TEXT_CHAR) { offset++; length++; }
            if(!length) { continue; }
            title = fieldMap[oFile.getByteAt(fieldStart + 1)];
            value = oFile.getStringAt(iStart + i + 2, length) || '';
            value = value.replace('\000','').trim();
            data[title] = value;
            i+=length-1;
          }
        }
        return data;
      }
      function findIPTCinJPEG(oFile) {
        var aMarkers = [];
        if (oFile.getByteAt(0) != 0xFF || oFile.getByteAt(1) != 0xD8) {
          return false; // not a valid jpeg
        }
        var iOffset = 2;
        var iLength = oFile.getLength();
        while (iOffset < iLength) {
          if (oFile.getByteAt(iOffset) != 0xFF) {
            if (bDebug) console.log("Not a valid marker at offset " + iOffset + ", found: " + oFile.getByteAt(iOffset));
            return false; // not a valid marker, something is wrong
          }
          var iMarker = oFile.getByteAt(iOffset+1);
          if (iMarker == 237) {
            if (bDebug) console.log("Found 0xFFED marker");
            return readIPTCData(oFile, iOffset + 4, oFile.getShortAt(iOffset+2, true)-2);
          } else {
            iOffset += 2 + oFile.getShortAt(iOffset+2, true);
          }
        }
      }
    }
  };
  /**
   * Basic Javascript port of the MMCQ (modified median cut quantization)
   * algorithm from the Leptonica library (http://www.leptonica.com/).
   * Returns a color map you can use to map original pixels to the reduced
   * palette. Still a work in progress.
   *
   * @author Nick Rabinowitz
   * @example

  // array of pixels as [R,G,B] arrays
  var myPixels = [[190,197,190], [202,204,200], [207,214,210], [211,214,211], [205,207,207]
                  // etc
                  ];
  var maxColors = 4;

  var cmap = MMCQ.quantize(myPixels, maxColors);
  var newPalette = cmap.palette();
  var newPixels = myPixels.map(function(p) {
      return cmap.map(p);
  });

   */
  var MMCQ = (function() {
    var pv = {
        map: function(array, f) {
          var o = {};
          return f ? array.map(function(d, i) { o.index = i; return f.call(o, d); }) : array.slice();
        },
        naturalOrder: function(a, b) {
            return (a < b) ? -1 : ((a > b) ? 1 : 0);
        },
        sum: function(array, f) {
          var o = {};
          return array.reduce(f ? function(p, d, i) { o.index = i; return p + f.call(o, d); } : function(p, d) { return p + d; }, 0);
        },
        max: function(array, f) {
          return Math.max.apply(null, f ? pv.map(array, f) : array);
        }
    };
      // private constants
      var sigbits = 5,
          rshift = 8 - sigbits,
          maxIterations = 1000,
          fractByPopulations = 0.75;

      // get reduced-space color index for a pixel
      function getColorIndex(r, g, b) {
          return (r << (2 * sigbits)) + (g << sigbits) + b;
      }

      // Simple priority queue
      function PQueue(comparator) {
          var contents = [],
              sorted = false;

          function sort() {
              contents.sort(comparator);
              sorted = true;
          }

          return {
              push: function(o) {
                  contents.push(o);
                  sorted = false;
              },
              peek: function(index) {
                  if (!sorted) sort();
                  if (index===undefined) index = contents.length - 1;
                  return contents[index];
              },
              pop: function() {
                  if (!sorted) sort();
                  return contents.pop();
              },
              size: function() {
                  return contents.length;
              },
              map: function(f) {
                  return contents.map(f);
              },
              debug: function() {
                  if (!sorted) sort();
                  return contents;
              }
          };
      }

      // 3d color space box
      function VBox(r1, r2, g1, g2, b1, b2, histo) {
          var vbox = this;
          vbox.r1 = r1;
          vbox.r2 = r2;
          vbox.g1 = g1;
          vbox.g2 = g2;
          vbox.b1 = b1;
          vbox.b2 = b2;
          vbox.histo = histo;
      }
      VBox.prototype = {
          volume: function(force) {
              var vbox = this;
              if (!vbox._volume || force) {
                  vbox._volume = ((vbox.r2 - vbox.r1 + 1) * (vbox.g2 - vbox.g1 + 1) * (vbox.b2 - vbox.b1 + 1));
              }
              return vbox._volume;
          },
          count: function(force) {
              var vbox = this,
                  histo = vbox.histo;
              if (!vbox._count_set || force) {
                  var npix = 0,
                      i, j, k;
                  for (i = vbox.r1; i <= vbox.r2; i++) {
                      for (j = vbox.g1; j <= vbox.g2; j++) {
                          for (k = vbox.b1; k <= vbox.b2; k++) {
                               index = getColorIndex(i,j,k);
                               npix += (histo[index] || 0);
                          }
                      }
                  }
                  vbox._count = npix;
                  vbox._count_set = true;
              }
              return vbox._count;
          },
          copy: function() {
              var vbox = this;
              return new VBox(vbox.r1, vbox.r2, vbox.g1, vbox.g2, vbox.b1, vbox.b2, vbox.histo);
          },
          avg: function(force) {
              var vbox = this,
                  histo = vbox.histo;
              if (!vbox._avg || force) {
                  var ntot = 0,
                      mult = 1 << (8 - sigbits),
                      rsum = 0,
                      gsum = 0,
                      bsum = 0,
                      hval,
                      i, j, k, histoindex;
                  for (i = vbox.r1; i <= vbox.r2; i++) {
                      for (j = vbox.g1; j <= vbox.g2; j++) {
                          for (k = vbox.b1; k <= vbox.b2; k++) {
                               histoindex = getColorIndex(i,j,k);
                               hval = histo[histoindex] || 0;
                               ntot += hval;
                               rsum += (hval * (i + 0.5) * mult);
                               gsum += (hval * (j + 0.5) * mult);
                               bsum += (hval * (k + 0.5) * mult);
                          }
                      }
                  }
                  if (ntot) {
                      vbox._avg = [~~(rsum/ntot), ~~(gsum/ntot), ~~(bsum/ntot)];
                  } else {
  //                    console.log('empty box');
                      vbox._avg = [
                          ~~(mult * (vbox.r1 + vbox.r2 + 1) / 2),
                          ~~(mult * (vbox.g1 + vbox.g2 + 1) / 2),
                          ~~(mult * (vbox.b1 + vbox.b2 + 1) / 2)
                      ];
                  }
              }
              return vbox._avg;
          },
          contains: function(pixel) {
              var vbox = this,
                  rval = pixel[0] >> rshift;
                  gval = pixel[1] >> rshift;
                  bval = pixel[2] >> rshift;
              return (rval >= vbox.r1 && rval <= vbox.r2 &&
                      gval >= vbox.g1 && gval <= vbox.g2 &&
                      bval >= vbox.b1 && bval <= vbox.b2);
          }
      };

      // Color map
      function CMap() {
          this.vboxes = new PQueue(function(a,b) {
              return pv.naturalOrder(
                  a.vbox.count()*a.vbox.volume(),
                  b.vbox.count()*b.vbox.volume()
              );
          });
      }
      CMap.prototype = {
          push: function(vbox) {
              this.vboxes.push({
                  vbox: vbox,
                  color: vbox.avg()
              });
          },
          palette: function() {
              return this.vboxes.map(function(vb) { return vb.color });
          },
          size: function() {
              return this.vboxes.size();
          },
          map: function(color) {
              var vboxes = this.vboxes;
              for (var i=0; i<vboxes.size(); i++) {
                  if (vboxes.peek(i).vbox.contains(color)) {
                      return vboxes.peek(i).color;
                  }
              }
              return this.nearest(color);
          },
          nearest: function(color) {
              var vboxes = this.vboxes,
                  d1, d2, pColor;
              for (var i=0; i<vboxes.size(); i++) {
                  d2 = Math.sqrt(
                      Math.pow(color[0] - vboxes.peek(i).color[0], 2) +
                      Math.pow(color[1] - vboxes.peek(i).color[1], 2) +
                      Math.pow(color[2] - vboxes.peek(i).color[2], 2)
                  );
                  if (d2 < d1 || d1 === undefined) {
                      d1 = d2;
                      pColor = vboxes.peek(i).color;
                  }
              }
              return pColor;
          },
          forcebw: function() {
              // XXX: won't  work yet
              var vboxes = this.vboxes;
              vboxes.sort(function(a,b) { return pv.naturalOrder(pv.sum(a.color), pv.sum(b.color) )});

              // force darkest color to black if everything < 5
              var lowest = vboxes[0].color;
              if (lowest[0] < 5 && lowest[1] < 5 && lowest[2] < 5)
                  vboxes[0].color = [0,0,0];

              // force lightest color to white if everything > 251
              var idx = vboxes.length-1,
                  highest = vboxes[idx].color;
              if (highest[0] > 251 && highest[1] > 251 && highest[2] > 251)
                  vboxes[idx].color = [255,255,255];
          }
      };

      // histo (1-d array, giving the number of pixels in
      // each quantized region of color space), or null on error
      function getHisto(pixels) {
          var histosize = 1 << (3 * sigbits),
              histo = new Array(histosize),
              index, rval, gval, bval;
          pixels.forEach(function(pixel) {
              rval = pixel[0] >> rshift;
              gval = pixel[1] >> rshift;
              bval = pixel[2] >> rshift;
              index = getColorIndex(rval, gval, bval);
              histo[index] = (histo[index] || 0) + 1;
          });
          return histo;
      }

      function vboxFromPixels(pixels, histo) {
          var rmin=1000000, rmax=0,
              gmin=1000000, gmax=0,
              bmin=1000000, bmax=0,
              rval, gval, bval;
          // find min/max
          pixels.forEach(function(pixel) {
              rval = pixel[0] >> rshift;
              gval = pixel[1] >> rshift;
              bval = pixel[2] >> rshift;
              if (rval < rmin) rmin = rval;
              else if (rval > rmax) rmax = rval;
              if (gval < gmin) gmin = gval;
              else if (gval > gmax) gmax = gval;
              if (bval < bmin) bmin = bval;
              else if (bval > bmax)  bmax = bval;
          });
          return new VBox(rmin, rmax, gmin, gmax, bmin, bmax, histo);
      }

      function medianCutApply(histo, vbox) {
          if (!vbox.count()) return;

          var rw = vbox.r2 - vbox.r1 + 1,
              gw = vbox.g2 - vbox.g1 + 1,
              bw = vbox.b2 - vbox.b1 + 1,
              maxw = pv.max([rw, gw, bw]);
          // only one pixel, no split
          if (vbox.count() == 1) {
              return [vbox.copy()]
          }
          /* Find the partial sum arrays along the selected axis. */
          var total = 0,
              partialsum = [],
              lookaheadsum = [],
              i, j, k, sum, index;
          if (maxw == rw) {
              for (i = vbox.r1; i <= vbox.r2; i++) {
                  sum = 0;
                  for (j = vbox.g1; j <= vbox.g2; j++) {
                      for (k = vbox.b1; k <= vbox.b2; k++) {
                          index = getColorIndex(i,j,k);
                          sum += (histo[index] || 0);
                      }
                  }
                  total += sum;
                  partialsum[i] = total;
              }
          }
          else if (maxw == gw) {
              for (i = vbox.g1; i <= vbox.g2; i++) {
                  sum = 0;
                  for (j = vbox.r1; j <= vbox.r2; j++) {
                      for (k = vbox.b1; k <= vbox.b2; k++) {
                          index = getColorIndex(j,i,k);
                          sum += (histo[index] || 0);
                      }
                  }
                  total += sum;
                  partialsum[i] = total;
              }
          }
          else {  /* maxw == bw */
              for (i = vbox.b1; i <= vbox.b2; i++) {
                  sum = 0;
                  for (j = vbox.r1; j <= vbox.r2; j++) {
                      for (k = vbox.g1; k <= vbox.g2; k++) {
                          index = getColorIndex(j,k,i);
                          sum += (histo[index] || 0);
                      }
                  }
                  total += sum;
                  partialsum[i] = total;
              }
          }
          partialsum.forEach(function(d,i) {
              lookaheadsum[i] = total-d
          });
          function doCut(color) {
              var dim1 = color + '1',
                  dim2 = color + '2',
                  left, right, vbox1, vbox2, d2, count2=0;
              for (i = vbox[dim1]; i <= vbox[dim2]; i++) {
                  if (partialsum[i] > total / 2) {
                      vbox1 = vbox.copy();
                      vbox2 = vbox.copy();
                      left = i - vbox[dim1];
                      right = vbox[dim2] - i;
                      if (left <= right)
                          d2 = Math.min(vbox[dim2] - 1, ~~(i + right / 2));
                      else d2 = Math.max(vbox[dim1], ~~(i - 1 - left / 2));
                      // avoid 0-count boxes
                      while (!partialsum[d2]) d2++;
                      count2 = lookaheadsum[d2];
                      while (!count2 && partialsum[d2-1]) count2 = lookaheadsum[--d2];
                      // set dimensions
                      vbox1[dim2] = d2;
                      vbox2[dim1] = vbox1[dim2] + 1;
  //                    console.log('vbox counts:', vbox.count(), vbox1.count(), vbox2.count());
                      return [vbox1, vbox2];
                  }
              }

          }
          // determine the cut planes
          return maxw == rw ? doCut('r') :
              maxw == gw ? doCut('g') :
              doCut('b');
      }

      function quantize(pixels, maxcolors) {
          // short-circuit
          if (!pixels.length || maxcolors < 2 || maxcolors > 256) {
  //            console.log('wrong number of maxcolors');
              return false;
          }

          // XXX: check color content and convert to grayscale if insufficient

          var histo = getHisto(pixels),
              histosize = 1 << (3 * sigbits);

          // check that we aren't below maxcolors already
          var nColors = 0;
          histo.forEach(function() { nColors++ });
          if (nColors <= maxcolors) {
              // XXX: generate the new colors from the histo and return
          }

          // get the beginning vbox from the colors
          var vbox = vboxFromPixels(pixels, histo),
              pq = new PQueue(function(a,b) { return pv.naturalOrder(a.count(), b.count()) });
          pq.push(vbox);

          // inner function to do the iteration
          function iter(lh, target) {
              var ncolors = 1,
                  niters = 0,
                  vbox;
              while (niters < maxIterations) {
                  vbox = lh.pop();
                  if (!vbox.count())  { /* just put it back */
                      lh.push(vbox);
                      niters++;
                      continue;
                  }
                  // do the cut
                  var vboxes = medianCutApply(histo, vbox),
                      vbox1 = vboxes[0],
                      vbox2 = vboxes[1];

                  if (!vbox1) {
  //                    console.log("vbox1 not defined; shouldn't happen!");
                      return;
                  }
                  lh.push(vbox1);
                  if (vbox2) {  /* vbox2 can be null */
                      lh.push(vbox2);
                      ncolors++;
                  }
                  if (ncolors >= target) return;
                  if (niters++ > maxIterations) {
  //                    console.log("infinite loop; perhaps too few pixels!");
                      return;
                  }
              }
          }

          // first set of colors, sorted by population
          iter(pq, fractByPopulations * maxcolors);

          // Re-sort by the product of pixel occupancy times the size in color space.
          var pq2 = new PQueue(function(a,b) {
              return pv.naturalOrder(a.count()*a.volume(), b.count()*b.volume())
          });
          while (pq.size()) {
              pq2.push(pq.pop());
          }

          // next set - generate the median cuts using the (npix * vol) sorting.
          iter(pq2, maxcolors - pq2.size());

          // calculate the actual colors
          var cmap = new CMap();
          while (pq2.size()) {
              cmap.push(pq2.pop());
          }

          return cmap;
      }

      return {
          quantize: quantize
      }
  })();
  /*
    CanvasImage Class
    Class that wraps the html image element and canvas.
    It also simplifies some of the canvas context manipulation
    with a set of helper functions.
  */
  var CanvasImage = function (image) {
    this.canvas  = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');

    document.body.appendChild(this.canvas);

    this.width  = this.canvas.width  = image.width;
    this.height = this.canvas.height = image.height;

    this.context.drawImage(image, 0, 0, this.width, this.height);
  };

  CanvasImage.prototype.clear = function () {
    this.context.clearRect(0, 0, this.width, this.height);
  };

  CanvasImage.prototype.update = function (imageData) {
    this.context.putImageData(imageData, 0, 0);
  };

  CanvasImage.prototype.getPixelCount = function () {
    return this.width * this.height;
  };

  CanvasImage.prototype.getImageData = function () {
    return this.context.getImageData(0, 0, this.width, this.height);
  };

  CanvasImage.prototype.removeCanvas = function () {
    this.canvas.parentNode.removeChild(this.canvas);
  };
  var BinaryFile = function(strData, iDataOffset, iDataLength) {
    var data = strData;
    var dataOffset = iDataOffset || 0;
    var dataLength = 0;

    this.getRawData = function() {
      return data;
    };

    if (typeof strData == "string") {
      dataLength = iDataLength || data.length;

      this.getByteAt = function(iOffset) {
        return data.charCodeAt(iOffset + dataOffset) & 0xFF;
      };
      
      this.getBytesAt = function(iOffset, iLength) {
        var aBytes = [];
        
        for (var i = 0; i < iLength; i++) {
          aBytes[i] = data.charCodeAt((iOffset + i) + dataOffset) & 0xFF
        };
        
        return aBytes;
      };
    } else if (typeof strData == "unknown") {
      dataLength = iDataLength || IEBinary_getLength(data);

      this.getByteAt = function(iOffset) {
        return IEBinary_getByteAt(data, iOffset + dataOffset);
      };

      this.getBytesAt = function(iOffset, iLength) {
        return new VBArray(IEBinary_getBytesAt(data, iOffset + dataOffset, iLength)).toArray();
      };
    }

    this.getLength = function() {
      return dataLength;
    };

    this.getSByteAt = function(iOffset) {
      var iByte = this.getByteAt(iOffset);
      if (iByte > 127)
        return iByte - 256;
      else
        return iByte;
    };

    this.getShortAt = function(iOffset, bBigEndian) {
      var iShort = bBigEndian ? 
        (this.getByteAt(iOffset) << 8) + this.getByteAt(iOffset + 1)
        : (this.getByteAt(iOffset + 1) << 8) + this.getByteAt(iOffset)
      if (iShort < 0) iShort += 65536;
      return iShort;
    };
    this.getSShortAt = function(iOffset, bBigEndian) {
      var iUShort = this.getShortAt(iOffset, bBigEndian);
      if (iUShort > 32767)
        return iUShort - 65536;
      else
        return iUShort;
    };
    this.getLongAt = function(iOffset, bBigEndian) {
      var iByte1 = this.getByteAt(iOffset),
        iByte2 = this.getByteAt(iOffset + 1),
        iByte3 = this.getByteAt(iOffset + 2),
        iByte4 = this.getByteAt(iOffset + 3);

      var iLong = bBigEndian ? (((((iByte1 << 8) + iByte2) << 8) + iByte3) << 8) + iByte4 : (((((iByte4 << 8) + iByte3) << 8) + iByte2) << 8) + iByte1;
      if (iLong < 0) iLong += 4294967296;
      return iLong;
    };
    this.getSLongAt = function(iOffset, bBigEndian) {
      var iULong = this.getLongAt(iOffset, bBigEndian);
      if (iULong > 2147483647)
        return iULong - 4294967296;
      else
        return iULong;
    };

    this.getStringAt = function(iOffset, iLength) {
      var aStr = [];
      
      var aBytes = this.getBytesAt(iOffset, iLength);
      for (var j=0; j < iLength; j++) {
        aStr[j] = String.fromCharCode(aBytes[j]);
      }
      return aStr.join("");
    };
    
    this.getCharAt = function(iOffset) {
      return String.fromCharCode(this.getByteAt(iOffset));
    };
    this.toBase64 = function() {
      return window.btoa(data);
    };
    this.fromBase64 = function(strBase64) {
      data = window.atob(strBase64);
    };
  };
  var BinaryAjax = (function() {
    function createRequest() {
      var oHTTP = null;
      if (window.ActiveXObject) {
        oHTTP = new ActiveXObject("Microsoft.XMLHTTP");
      } else if (window.XMLHttpRequest) {
        oHTTP = new XMLHttpRequest();
      }
      return oHTTP;
    }

    function getHead(strURL, fncCallback, fncError) {
      var oHTTP = createRequest();
      if (oHTTP) {
        if (fncCallback) {
          if (typeof(oHTTP.onload) != "undefined") {
            oHTTP.onload = function() {
              if (oHTTP.status == "200") {
                fncCallback(this);
              } else {
                if (fncError) fncError();
              }
              oHTTP = null;
            };
          } else {
            oHTTP.onreadystatechange = function() {
              if (oHTTP.readyState == 4) {
                if (oHTTP.status == "200") {
                  fncCallback(this);
                } else {
                  if (fncError) fncError();
                }
                oHTTP = null;
              }
            };
          }
        }
        oHTTP.open("HEAD", strURL, true);
        oHTTP.send(null);
      } else {
        if (fncError) fncError();
      }
    }

    function sendRequest(strURL, fncCallback, fncError, aRange, bAcceptRanges, iFileSize) {
      var oHTTP = createRequest();
      if (oHTTP) {

        var iDataOffset = 0;
        if (aRange && !bAcceptRanges) {
          iDataOffset = aRange[0];
        }
        var iDataLen = 0;
        if (aRange) {
          iDataLen = aRange[1]-aRange[0]+1;
        }

        if (fncCallback) {
          if (typeof(oHTTP.onload) != "undefined") {
            oHTTP.onload = function() {
              if (oHTTP.status == "200" || oHTTP.status == "206" || oHTTP.status == "0") {
                oHTTP.binaryResponse = new BinaryFile(oHTTP.responseText, iDataOffset, iDataLen);
                oHTTP.fileSize = iFileSize || oHTTP.getResponseHeader("Content-Length");
                fncCallback(oHTTP);
              } else {
                if (fncError) fncError();
              }
              oHTTP = null;
            };
          } else {
            oHTTP.onreadystatechange = function() {
              if (oHTTP.readyState == 4) {
                if (oHTTP.status == "200" || oHTTP.status == "206" || oHTTP.status == "0") {
                  // IE6 craps if we try to extend the XHR object
                  var oRes = {
                    status : oHTTP.status,
                    // IE needs responseBody, Chrome/Safari needs responseText
                    binaryResponse : new BinaryFile(
                      typeof oHTTP.responseBody == "unknown" ? oHTTP.responseBody : oHTTP.responseText, iDataOffset, iDataLen
                    ),
                    fileSize : iFileSize || oHTTP.getResponseHeader("Content-Length")
                  };
                  fncCallback(oRes);
                } else {
                  if (fncError) fncError();
                }
                oHTTP = null;
              }
            };
          }
        }
        oHTTP.open("GET", strURL, true);

        if (oHTTP.overrideMimeType) oHTTP.overrideMimeType('text/plain; charset=x-user-defined');

        if (aRange && bAcceptRanges) {
          oHTTP.setRequestHeader("Range", "bytes=" + aRange[0] + "-" + aRange[1]);
        }

        oHTTP.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 1970 00:00:00 GMT");

        oHTTP.send(null);
      } else {
        if (fncError) fncError();
      }
    }

    return function(strURL, fncCallback, fncError, aRange) {

      if (aRange) {
        getHead(
          strURL, 
          function(oHTTP) {
            var iLength = parseInt(oHTTP.getResponseHeader("Content-Length"),10);
            var strAcceptRanges = oHTTP.getResponseHeader("Accept-Ranges");

            var iStart, iEnd;
            iStart = aRange[0];
            if (aRange[0] < 0) 
              iStart += iLength;
            iEnd = iStart + aRange[1] - 1;

            sendRequest(strURL, fncCallback, fncError, [iStart, iEnd], (strAcceptRanges == "bytes"), iLength);
          }
        );

      } else {
        sendRequest(strURL, fncCallback, fncError);
      }
    }
  }());
  document.write(
    ["<script type='text/vbscript'>\r\n",
    "Function IEBinary_getByteAt(strBinary, iOffset)\r\n",
    " IEBinary_getByteAt = AscB(MidB(strBinary, iOffset + 1, 1))\r\n",
    "End Function\r\n",
    "Function IEBinary_getBytesAt(strBinary, iOffset, iLength)\r\n",
    "  Dim aBytes()\r\n",
    "  ReDim aBytes(iLength - 1)\r\n",
    "  For i = 0 To iLength - 1\r\n",
    "   aBytes(i) = IEBinary_getByteAt(strBinary, iOffset + i)\r\n"  ,
    "  Next\r\n",
    "  IEBinary_getBytesAt = aBytes\r\n" ,
    "End Function\r\n",
    "Function IEBinary_getLength(strBinary)\r\n",
    " IEBinary_getLength = LenB(strBinary)\r\n",
    "End Function\r\n",
    "</script>\r\n"].join('')
  );
})(this, this.document);