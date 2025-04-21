// ebayHtmlTemplate.util.ets
const ebayHtmlTemplate = (data: any) => {


  const generateSpecsRows = (specs: Record<string, any>) => {
    let rows = '';

    for (const [label, value] of Object.entries(specs)) {
      if (value) {
        rows += `
          <tr data-spec="${value}">
            <td>${label}</td>
          </tr>
        `;
      }
    }

    return rows;
  };

  const specs = {

    ITEMTITLE: data.title,
    IMAGE01: data.imageUrls[0],
    IMAGE02: data.imageUrls[1],
    IMAGE03: data.imageUrls[2],
    IMAGE04: data.imageUrls[3],
    IMAGE05: data.imageUrls[4],
    IMAGE06: data.imageUrls[5],
    IMAGE07: data.imageUrls[6],
    IMAGE08: data.imageUrls[7],
    ITEMDESCRIPTION: data.description,
    DEFAULTEBAYSTORECATEGORYID: data.categoryId,
    STOREFRONTPRICE: data?.prodPricing?.retailPrice ?? data?.prodPricing?.selectedVariations?.[0]?.retailPrice ?? 0,
    CPU: data.prodTechInfo?.cpu,
    GPU: data.prodTechInfo?.gpu,
    RAM: data.prodTechInfo?.ram,
    STORAGE: data.prodTechInfo?.storage,
    POWER: data.prodTechInfo?.power,


    PROCESSOR: data.prodTechInfo?.processor,
    MODEL: data.prodTechInfo?.model,
    OPERATINGSYSTEM: data.prodTechInfo?.operatingSystem,
    STORAGETYPE: data.prodTechInfo?.storageType,
    FEATURES: data.prodTechInfo?.features,
    SSDCAPACITY: data.prodTechInfo?.ssdCapacity,
    TYPE: data.prodTechInfo?.type,
    RELEASEYEAR: data.prodTechInfo?.releaseYear,



    HARDDRIVECAPACITY: data.prodTechInfo?.hardDriveCapacity,
    COLOR: data.prodTechInfo?.color,
    MAXRESOLUTION: data.prodTechInfo?.maxResolution,
    MOSTSUITABLEFOR: data.prodTechInfo?.mostSuitableFor,
    SCREENSIZE: data.prodTechInfo?.screenSize,
    GRAPHICSPROCESSINGTYPE: data.prodTechInfo?.graphicsProcessingType,
    CONNECTIVITY: data.prodTechInfo?.connectivity,
    MOTHERBOARDMODEL: data.prodTechInfo?.motherboardModel,
    SERIES: data.prodTechInfo?.series,
    OPERATINGSYSTEMEDITION: data.prodTechInfo?.operatingSystemEdition,
    MEMORY: data.prodTechInfo?.memory,
    MAXRAMCAPACITY: data.prodTechInfo?.maxRamCapacity,
    UNITTYPE: data.prodTechInfo?.unitType,
    UNITQUANTITY: data.prodTechInfo?.unitQuantity,
    MPN: data.prodTechInfo?.mpn,
    PROCESSORSPEED: data.prodTechInfo?.processorSpeed,
    RAMSIZE: data.prodTechInfo?.ramSize,
    FORMFACTOR: data.prodTechInfo?.formFactor,
    EAN: data.prodTechInfo?.ean.map((ean: string) => ean.trim()),
    PRODUCTTYPE: data.prodTechInfo?.productType,
    MANUFACTURERWARRANTY: data.prodTechInfo?.manufacturerWarranty,
    REGIONOFMANUFACTURE: data.prodTechInfo?.regionOfManufacture,
    HEIGHT: data.prodTechInfo?.height,
    LENGTH: data.prodTechInfo?.length,
    WIDTH: data.prodTechInfo?.width,
    WEIGHT: data.prodTechInfo?.weight,
    NONNEWCONDITIONDETAILS: data.prodTechInfo?.nonNewConditionDetails,
    PRODUCTCONDITION: data.prodTechInfo?.productCondition,
    NUMBEROFLANPORTS: data.prodTechInfo?.numberOfLanPorts,
    MAXIMUMWIRELESSDATA: data.prodTechInfo?.maximumWirelessData,
    MAXIMUMLANDATARATE: data.prodTechInfo?.maximumLanDataRate,
    PORTS: data.prodTechInfo?.ports,
    TOFIT: data.prodTechInfo?.toFit,
    DISPLAYTYPE: data.prodTechInfo?.displayType,
    ASPECTRATIO: data.prodTechInfo?.aspectRatio,
    IMAGEBRIGHTNESS: data.prodTechInfo?.imageBrightness,
    THROWRATIO: data.prodTechInfo?.throwRatio,
    COMPATIBLEOPERATINGSYSTEM: data.prodTechInfo?.compatibleOperatingSystem,
    COMPATIBLEFORMAT: data.prodTechInfo?.compatibleFormat,
    LENSMAGNIFICATION: data.prodTechInfo?.lensMagnification,
    YEARMANUFACTURED: data.prodTechInfo?.yearManufactured,
    NATIVERESOLUTION: data.prodTechInfo?.nativeResolution,
    DISPLAYTECHNOLOGY: data.prodTechInfo?.displayTechnology,
    ENERGYEFFICIENCYRATING: data.prodTechInfo?.energyEfficiencyRating,
    VIDEOINPUTS: data.prodTechInfo?.videoInputs,
    REFRESHRATE: data.prodTechInfo?.refreshRate,
    RESPONSETIME: data.prodTechInfo?.responseTime,
    BRIGHTNESS: data.prodTechInfo?.brightness,
    CONTRASTRATIO: data.prodTechInfo?.contrastRatio,
    ECRANGE: data.prodTechInfo?.ecRange,
    PRODUCTLINE: data.prodTechInfo?.productLine,
    CUSTOMBUNDLE: data.prodTechInfo?.customBundle,
    INTERFACE: data.prodTechInfo?.interface,
    NETWORKCONNECTIVITY: data.prodTechInfo?.networkConnectivity,
    NETWORKMANAGEMENTTYPE: data.prodTechInfo?.networkManagementType,
    NETWORKTYPE: data.prodTechInfo?.networkType,
    PROCESSORMANUFACTURER: data.prodTechInfo?.processorManufacturer,
    NUMBEROFPROCESSORS: data.prodTechInfo?.numberOfProcessors,
    NUMBEROFVANPORTS: data.prodTechInfo?.numberOfVanPorts,
    PROCESSORTYPE: data.prodTechInfo?.processorType,
    RAIDLEVEL: data.prodTechInfo?.raidLevel,
    MEMORYTYPE: data.prodTechInfo?.memoryType,
    DEVICECONNECTIVITY: data.prodTechInfo?.deviceConnectivity,
    CONNECTORTYPE: data.prodTechInfo?.connectorType,
    SUPPORTEDWIRELESSPROTOCOL: data.prodTechInfo?.supportedWirelessProtocol,
    COMPATIBLEOPERATINGSYSTEMS: data.prodTechInfo?.compatibleOperatingSystems,
    CALIFORNIAPROP65WARNING: data.prodTechInfo?.californiaProp65Warning,
    WARRANTYDURATION: data.prodPricing?.warrantyDuration,
    WARRANTYCOVERAGE: data.prodPricing?.warrantyCoverage,
    WARRANTYDOCUMENT: data.prodPricing?.warrantyDocument,
    POSTAGEPOLICY: data.prodDelivery?.postagePolicy,
    PACKAGEWEIGHT: data.prodDelivery?.packageWeight,
    PACKAGEDIMENSIONS: data.prodDelivery?.packageDimensions,
    IRREGULARPACKAGE: data.prodDelivery?.irregularPackage,




  };
  const specsHtml = generateSpecsRows(specs);
  const htmlData = `

<html lang="en" dir="ltr" class="no-js">
  <head>
    <title>{{ ITEMTITLE }}</title>
    <meta name="language" content="en-uk" />
    <meta name="copyright" content="Studioworx - eBay Listing and Store Design" />
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
  </head>

  <body>
    <!-- *******************************************************************************************************************
		© COPYRIGHT Studioworx - This template may not be used or reproduced in whole or in part without formal written consent.
		************************************************************************************************************************ -->

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&display=swap"
      rel="stylesheet"
    />

    <!-- Default styles -->
    <link
      type="text/css"
      rel="stylesheet"
      href="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/layout.css"
    />
    <link
      type="text/css"
      rel="stylesheet"
      href="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/default.css"
    />

    <!-- Feedback -->
    <link
      type="text/css"
      rel="stylesheet"
      href="https://sf.elist.store/birmingham-av/css/latest-feedback.css"
      id="latest"
    />
    <link
      type="text/css"
      rel="stylesheet"
      href="https://sf.elist.store/birmingham-av/css/{{ AZ09TITLE }}.css"
      id="feedbacks"
    />

    <!-- Cross Promotion Products -->
    <link
      type="text/css"
      rel="stylesheet"
      href="https://sp.elist.store/birmingham-av-2/promo/{{ DEFAULTEBAYSTORECATEGORYID }}/best-sellers.css"
      id="cross-promotions"
    />

    <div vocab="https://schema.org/" typeof="Product" style="display: none">
      <span property="description">{{ MOBILE - SUMMARY }}</span>
    </div>

    <div id="page" data-title="{{ ITEMTITLE }}">
      <div id="header-top" class="section">
        <div class="container">
          <span><!-- content --></span>
        </div>
      </div>

      <div id="header" class="section">
        <div class="container">
          <div class="logo">
            <a target="_blank" href="https://www.ebay.co.uk/str/midlandsav">
              <img src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/logo.png" />
            </a>
          </div>

          <!-- Start - eBay Mobile Menu -->
          <div id="header-menu-mobile" class="hidden-lg-up">
            <input id="mobile-control-close" type="radio" class="mobile-control" name="mob" />
            <input id="mobile-control-open" type="radio" class="mobile-control" name="mob" />
            <label for="mobile-control-open" class="mobile-menu-toggle"
              ><span class="icon"><span></span><span></span><span></span></span
            ></label>
            <ul class="categories">
              <label for="mobile-control-close"></label>
              <li>
                <a
                  href="https://www.ebay.co.uk/str/midlandsav/All-In-One-Pc/_i.html?store_cat=20334827015"
                  target="_blank"
                  >All In One PCs</a
                >
              </li>
              <li>
                <a href="https://www.ebay.co.uk/str/midlandsav/Computers/_i.html?store_cat=18516552015" target="_blank"
                  >Computers</a
                >
              </li>
              <li>
                <a
                  href="https://www.ebay.co.uk/str/midlandsav/Gaming-PC-Bundles/_i.html?store_cat=18516558015"
                  target="_blank"
                  >Gaming PC Bundles</a
                >
              </li>
              <li>
                <a href="https://www.ebay.co.uk/str/midlandsav/Laptops/_i.html?store_cat=18516553015" target="_blank"
                  >Laptops</a
                >
              </li>
              <li>
                <a href="https://www.ebay.co.uk/str/midlandsav/Monitors/_i.html?store_cat=18516554015" target="_blank"
                  >Monitors</a
                >
              </li>
              <li>
                <a
                  href="https://www.ebay.co.uk/str/midlandsav/Enterprise-Networking-Servers/_i.html?store_cat=20334836015"
                  target="_blank"
                  >Network Equipment</a
                >
              </li>
            </ul>
            <div class="bg"></div>
          </div>
          <!-- End - eBay Mobile Menu -->
        </div>
      </div>

      <!-- Start - eBay Shop Categories -->
      <div id="header-menu" class="section hidden-md-down">
        <div class="container">
          <div class="category-list">
            <ul>
              <li>
                <a
                  href="https://www.ebay.co.uk/str/midlandsav/All-In-One-Pc/_i.html?store_cat=20334827015"
                  target="_blank"
                  >All In One PCs</a
                >
              </li>
              <li>
                <a href="https://www.ebay.co.uk/str/midlandsav/Computers/_i.html?store_cat=18516552015" target="_blank"
                  >Computers</a
                >
              </li>
              <li>
                <a
                  href="https://www.ebay.co.uk/str/midlandsav/Gaming-PC-Bundles/_i.html?store_cat=18516558015"
                  target="_blank"
                  >Gaming PC Bundles</a
                >
              </li>
              <li>
                <a href="https://www.ebay.co.uk/str/midlandsav/Laptops/_i.html?store_cat=18516553015" target="_blank"
                  >Laptops</a
                >
              </li>
              <li>
                <a href="https://www.ebay.co.uk/str/midlandsav/Monitors/_i.html?store_cat=18516554015" target="_blank"
                  >Monitors</a
                >
              </li>
              <li>
                <a
                  href="https://www.ebay.co.uk/str/midlandsav/Enterprise-Networking-Servers/_i.html?store_cat=20334836015"
                  target="_blank"
                  >Network Equipment</a
                >
              </li>
            </ul>
          </div>
        </div>
      </div>
      <!-- End - eBay Shop Categories -->

      <div id="banner" class="section">
        <div class="container">
          <a href="https://www.ebay.co.uk/str/midlandsav" target="_blank">
            <img src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/banner.jpg" />
          </a>
        </div>
      </div>

      <div id="main" class="section">
        <div class="container">
          <div class="row">
            <div class="col-xs-12">
              <div class="row">
                <div class="col-xs-12 col-md-6 col-xlg-5">
                  <div class="images">
                    <input type="radio" name="push" id="push1" class="push" checked="" />
                    <label for="push1" class="left one" data="{{ IMAGE05 }}"></label>

                    <input type="radio" name="push" id="push2" class="push" />
                    <label for="push2" class="right one" data="{{ IMAGE05 }}"></label>

                    <input type="radio" name="push" id="push3" class="push" />
                    <label for="push3" class="right one" data="{{ IMAGE09 }}"></label>

                    <div class="image-container">
                      <div class="image-scroll clearfix">
                        <div class="image" data-image="{{ IMAGE01 }}">
                          <input
                            id="thumbnail-control-1"
                            type="radio"
                            name="thumbnails"
                            class="thumbnails-control"
                            checked
                          />

                          <label
                            for="thumbnail-control-1"
                            id="thumbnail-1"
                            class="thumbnail"
                            data-checkimage2="{{ IMAGE02 }}"
                          >
                            <img src="{{ IMAGE01 }}" alt="Thumbnail 1" class="img-center" />
                          </label>

                          <input id="image-control-1" type="checkbox" class="main-control" />
                          <label for="image-control-1" id="image-1" class="main transition">
                            <div class="main-content">
                              <img src="{{ IMAGE01 }}" alt="{{ ITEMTITLE }}" class="img-center" />
                              <label for="thumbnail-control-video" data-prev="" class="prev"></label>
                              <label for="thumbnail-control-2" data-next="{{ IMAGE02 }}" class="next"></label>
                            </div>
                          </label>
                        </div>
                        <div class="image" data-image="{{ IMAGE02 }}">
                          <input id="thumbnail-control-2" type="radio" name="thumbnails" class="thumbnails-control" />
                          <label for="thumbnail-control-2" id="thumbnail-2" class="thumbnail">
                            <img src="{{ IMAGE02 }}" alt="Thumbnail 2" class="img-center" />
                          </label>

                          <input id="image-control-2" type="checkbox" class="main-control" />
                          <label for="image-control-2" id="image-2" class="main transition">
                            <div class="main-content">
                              <img src="{{ IMAGE02 }}" alt="{{ ITEMTITLE }}" class="img-center" />
                              <label for="thumbnail-control-1" data-prev="{{ IMAGE01 }}" class="prev"></label>
                              <label for="thumbnail-control-3" data-next="{{ IMAGE03 }}" class="next"></label>
                            </div>
                          </label>
                        </div>
                        <div class="image" data-image="{{ IMAGE03 }}">
                          <input id="thumbnail-control-3" type="radio" name="thumbnails" class="thumbnails-control" />
                          <label for="thumbnail-control-3" id="thumbnail-3" class="thumbnail">
                            <img src="{{ IMAGE03 }}" alt="Thumbnail 3" class="img-center" />
                          </label>

                          <input id="image-control-3" type="checkbox" class="main-control" />
                          <label for="image-control-3" id="image-3" class="main transition">
                            <div class="main-content">
                              <img src="{{ IMAGE03 }}" alt="{{ ITEMTITLE }}" class="img-center" />
                              <label for="thumbnail-control-2" data-prev="{{ IMAGE02 }}" class="prev"></label>
                              <label for="thumbnail-control-4" data-next="{{ IMAGE04 }}" class="next"></label>
                            </div>
                          </label>
                        </div>
                        <div class="image" data-image="{{ IMAGE04 }}">
                          <input id="thumbnail-control-4" type="radio" name="thumbnails" class="thumbnails-control" />
                          <label for="thumbnail-control-4" id="thumbnail-4" class="thumbnail">
                            <img src="{{ IMAGE04 }}" alt="Thumbnail 4" class="img-center" />
                          </label>

                          <input id="image-control-4" type="checkbox" class="main-control" />
                          <label for="image-control-4" id="image-4" class="main transition">
                            <div class="main-content">
                              <img src="{{ IMAGE04 }}" alt="{{ ITEMTITLE }}" class="img-center" />
                              <label for="thumbnail-control-3" data-prev="{{ IMAGE03 }}" class="prev"></label>
                              <label for="thumbnail-control-5" data-next="{{ IMAGE05 }}" class="next"></label>
                            </div>
                          </label>
                        </div>
                        <div class="image" data-image="{{ IMAGE05 }}">
                          <input id="thumbnail-control-5" type="radio" name="thumbnails" class="thumbnails-control" />
                          <label for="thumbnail-control-5" id="thumbnail-5" class="thumbnail">
                            <img src="{{ IMAGE05 }}" alt="Thumbnail 5" class="img-center" />
                          </label>

                          <input id="image-control-5" type="checkbox" class="main-control" />
                          <label for="image-control-5" id="image-5" class="main transition">
                            <div class="main-content">
                              <img src="{{ IMAGE05 }}" alt="{{ ITEMTITLE }}" class="img-center" />
                              <label for="thumbnail-control-4" data-prev="{{ IMAGE04 }}" class="prev"></label>
                              <label for="thumbnail-control-6" data-next="{{ IMAGE06 }}" class="next"></label>
                            </div>
                          </label>
                        </div>
                        <div class="image" data-image="{{ IMAGE06 }}">
                          <input id="thumbnail-control-6" type="radio" name="thumbnails" class="thumbnails-control" />
                          <label for="thumbnail-control-6" id="thumbnail-6" class="thumbnail">
                            <img src="{{ IMAGE06 }}" alt="Thumbnail 6" class="img-center" />
                          </label>

                          <input id="image-control-6" type="checkbox" class="main-control" />
                          <label for="image-control-6" id="image-6" class="main transition">
                            <div class="main-content">
                              <img src="{{ IMAGE06 }}" alt="{{ ITEMTITLE }}" class="img-center" />
                              <label for="thumbnail-control-5" data-prev="{{ IMAGE05 }}" class="prev"></label>
                              <label for="thumbnail-control-7" data-next="{{ IMAGE07 }}" class="next"></label>
                            </div>
                          </label>
                        </div>
                        <div class="image" data-image="{{ IMAGE07 }}">
                          <input id="thumbnail-control-7" type="radio" name="thumbnails" class="thumbnails-control" />
                          <label for="thumbnail-control-7" id="thumbnail-7" class="thumbnail">
                            <img src="{{ IMAGE07 }}" alt="Thumbnail 7" class="img-center" />
                          </label>

                          <input id="image-control-7" type="checkbox" class="main-control" />
                          <label for="image-control-7" id="image-7" class="main transition">
                            <div class="main-content">
                              <img src="{{ IMAGE07 }}" alt="{{ ITEMTITLE }}" class="img-center" />
                              <label for="thumbnail-control-6" data-prev="{{ IMAGE06 }}" class="prev"></label>
                              <label for="thumbnail-control-8" data-next="{{ IMAGE08 }}" class="next"></label>
                            </div>
                          </label>
                        </div>
                        <div class="image" data-image="{{ IMAGE08 }}">
                          <input id="thumbnail-control-8" type="radio" name="thumbnails" class="thumbnails-control" />
                          <label for="thumbnail-control-8" id="thumbnail-8" class="thumbnail">
                            <img src="{{ IMAGE08 }}" alt="Thumbnail 8" class="img-center" />
                          </label>

                          <input id="image-control-8" type="checkbox" class="main-control" />
                          <label for="image-control-8" id="image-8" class="main transition">
                            <div class="main-content">
                              <img src="{{ IMAGE08 }}" alt="{{ ITEMTITLE }}" class="img-center" />
                              <label for="thumbnail-control-7" data-prev="{{ IMAGE07 }}" class="prev"></label>
                              <label for="thumbnail-control-9" data-next="{{ IMAGE09 }}" class="next"></label>
                            </div>
                          </label>
                        </div>
                        <div class="image" data-image="{{ IMAGE09 }}">
                          <input id="thumbnail-control-9" type="radio" name="thumbnails" class="thumbnails-control" />
                          <label for="thumbnail-control-9" id="thumbnail-9" class="thumbnail">
                            <img src="{{ IMAGE09 }}" alt="Thumbnail 9" class="img-center" />
                          </label>

                          <input id="image-control-9" type="checkbox" class="main-control" />
                          <label for="image-control-9" id="image-9" class="main transition">
                            <div class="main-content">
                              <img src="{{ IMAGE09 }}" alt="{{ ITEMTITLE }}" class="img-center" />
                              <label for="thumbnail-control-8" data-prev="{{ IMAGE08 }}" class="prev"></label>
                              <label for="thumbnail-control-10" data-next="{{ IMAGE10 }}" class="next"></label>
                            </div>
                          </label>
                        </div>
                        <div class="image" data-image="{{ IMAGE10 }}">
                          <input id="thumbnail-control-10" type="radio" name="thumbnails" class="thumbnails-control" />
                          <label for="thumbnail-control-10" id="thumbnail-10" class="thumbnail">
                            <img src="{{ IMAGE10 }}" alt="Thumbnail 10" class="img-center" />
                          </label>

                          <input id="image-control-10" type="checkbox" class="main-control" />
                          <label for="image-control-10" id="image-10" class="main transition">
                            <div class="main-content">
                              <img src="{{ IMAGE10 }}" alt="{{ ITEMTITLE }}" class="img-center" />
                              <label for="thumbnail-control-9" data-prev="{{ IMAGE09 }}" class="prev"></label>
                              <label for="thumbnail-control-11" data-next="" class="next"></label>
                            </div>
                          </label>
                        </div>
                        <div class="image" data-image="{{ IMAGE11 }}">
                          <input id="thumbnail-control-11" type="radio" name="thumbnails" class="thumbnails-control" />
                          <label for="thumbnail-control-11" id="thumbnail-11" class="thumbnail">
                            <img src="{{ IMAGE11 }}" alt="Thumbnail 11" class="img-center" />
                          </label>

                          <input id="image-control-11" type="checkbox" class="main-control" />
                          <label for="image-control-11" id="image-11" class="main transition">
                            <div class="main-content">
                              <img src="{{ IMAGE11 }}" alt="{{ ITEMTITLE }}" class="img-center" />
                              <label for="thumbnail-control-10" data-prev="{{ IMAGE10 }}" class="prev"></label>
                              <label for="thumbnail-control-12" data-next="{{ IMAGE12 }}" class="next"></label>
                            </div>
                          </label>
                        </div>
                        <div class="image" data-image="{{ IMAGE12 }}">
                          <input id="thumbnail-control-12" type="radio" name="thumbnails" class="thumbnails-control" />
                          <label for="thumbnail-control-12" id="thumbnail-12" class="thumbnail">
                            <img src="{{ IMAGE12 }}" alt="Thumbnail 12" class="img-center" />
                          </label>

                          <input id="image-control-12" type="checkbox" class="main-control" />
                          <label for="image-control-12" id="image-12" class="main transition">
                            <div class="main-content">
                              <img src="{{ IMAGE12 }}" alt="{{ ITEMTITLE }}" class="img-center" />
                              <label for="thumbnail-control-11" data-prev="{{ IMAGE11 }}" class="prev"></label>
                              <label for="thumbnail-control-13" data-next="" class="next"></label>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="col-xs-12 col-md-6 col-xlg-7">
                  <div id="main-details">
                    <div class="condition-label used" data-condition="{{ USED }}"><!-- content --></div>
                    <div class="condition-label new" data-condition="{{ NEW }}"><!-- content --></div>
                    <div class="condition-label opened" data-condition="{{ NEW - OPENED }}"><!-- content --></div>

                    <h1>{{ ITEMTITLE }}</h1>

                    <div class="main-price" data-price="{{ STOREFRONTPRICE }}">
                      <div class="currency">&pound;</div>
                      <div class="value">{{ STOREFRONTPRICE }}</div>
                    </div>

                    <div class="trusted">
                      <h2><!-- content --></h2>
                      <div>
                        <img
                          src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/stars.png"
                        />
                      </div>
                      <a href="https://www.ebay.co.uk/str/midlandsav?_tab=2" target="_blank"><!-- content --></a>
                    </div>

                    <div class="buttons hidden-xs-down clearfix">
                      <h2><!-- content --></h2>
                      <a
                        target="_blank"
                        href="https://contact.ebay.co.uk/ws/eBayISAPI.dll?FindAnswers&requested=birmingham-av"
                        ><!-- content --></a
                      >
                    </div>
                  </div>
                </div>
              </div>

              <div class="tabs">
                <input id="tab-control-1" type="radio" name="tabs" class="tab-control" checked />
                <label for="tab-control-1" class="desktop-label">Description</label>

                <input id="tab-control-2" type="radio" name="tabs" class="tab-control" />
                <label for="tab-control-2" class="desktop-label">Specification</label>

                <input id="tab-control-3" type="radio" name="tabs" class="tab-control" />
                <label for="tab-control-3" class="desktop-label">Warranty</label>

                <input id="tab-control-4" type="radio" name="tabs" class="tab-control" />
                <label for="tab-control-4" class="desktop-label">Delivery</label>

                <input id="tab-control-5" type="radio" name="tabs" class="tab-control" />
                <label for="tab-control-5" class="desktop-label">Feedback</label>

                <label for="tab-control-1" class="mobile-label">Description</label>
                <div id="tab-content-1" class="tab-content">
                  <!-- Description Tab Content -->
                  <div class="condition">
                    <div id="condition-button">
                      <input id="popup-opened-condition" type="radio" name="popup-condition" />
                      <input id="popup-closed-condition" type="radio" name="popup-condition" checked />

                      <label for="popup-opened-condition">Item Condition Notes</label>

                      <div class="popup">
                        <div>
                          <div class="popup-header clearfix">
                            <label for="popup-closed-condition"></label>
                          </div>
                          <div class="popup-body">
                            <link
                              type="text/css"
                              rel="stylesheet"
                              href="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/content/condition.css"
                            />
                            <div class="notes">
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="item-description">{{ ITEMDESCRIPTION }}</div>
                  <div class="item-description-icons">
                    <table>
                      <tr data-spec="{{ CPU }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/cpu.png"
                          />
                        </th>
                        <td>cpu / processor</td>
                      </tr>
                      <tr data-spec="{{ RAM }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/ram.png"
                          />
                        </th>
                        <td>ram</td>
                      </tr>
                      <tr data-spec="{{ SSD }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/ssd.png"
                          />
                        </th>
                        <td>ssd</td>
                      </tr>
                      <tr data-spec="{{ HDD }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/hdd.png"
                          />
                        </th>
                        <td>hdd</td>
                      </tr>
                      <tr data-spec="{{ USB }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/usb.png"
                          />
                        </th>
                        <td>usb ports</td>
                      </tr>
                      <tr data-spec="{{ HDMI }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/hdmi.png"
                          />
                        </th>
                        <td>hdmi</td>
                      </tr>
                      <tr data-spec="{{ DISPLAY - PORT }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/displayport.png"
                          />
                        </th>
                        <td>display port</td>
                      </tr>
                      <tr data-spec="{{ VGA }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/vga.png"
                          />
                        </th>
                        <td>vga port</td>
                      </tr>
                      <tr data-spec="{{ USB - C }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/usb-c.png"
                          />
                        </th>
                        <td>usb-c</td>
                      </tr>
                      <tr data-spec="{{ ETHERNET }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/ethernet.png"
                          />
                        </th>
                        <td>ethernet / rj45 network</td>
                      </tr>
                      <tr data-spec="{{ CD - DVD }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/cd.png"
                          />
                        </th>
                        <td>cd/dvd optical</td>
                      </tr>
                      <tr data-spec="{{ WEBCAM }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/webcam.png"
                          />
                        </th>
                        <td>webcam</td>
                      </tr>
                      <tr data-spec="{{ WIFI }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/wifi.png"
                          />
                        </th>
                        <td>wifi</td>
                      </tr>
                      <tr data-spec="{{ BLUETOOTH }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/bluetooth.png"
                          />
                        </th>
                        <td>bluetooth</td>
                      </tr>
                      <tr data-spec="{{ SD - CARD }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/sdcard.png"
                          />
                        </th>
                        <td>sd card</td>
                      </tr>
                      <tr data-spec="{{ TOUCH - SCREEN }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/touch.png"
                          />
                        </th>
                        <td>touch screen</td>
                      </tr>
                      <tr data-spec="{{ SCREEN - SIZE }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/screensize.png"
                          />
                        </th>
                        <td>screen size</td>
                      </tr>
                      <tr data-spec="{{ WINDOWS }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/windows.png"
                          />
                        </th>
                        <td>windows</td>
                      </tr>
                      <tr data-spec="{{ POWER - CABLE }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/powercable.png"
                          />
                        </th>
                        <td>power cable</td>
                      </tr>
                      <tr data-spec="{{ VARIOUS }}">
                        <th>
                          <img
                            src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/specs/various.png"
                          />
                        </th>
                        <td>various</td>
                      </tr>
                    </table>
                  </div>
                  <div class="item-description-suffix">{{ ITEMDESCRIPTION - SUFFIX }}</div>
                </div>

                <label for="tab-control-2" class="mobile-label">Specification</label>
                <div id="tab-content-2" class="tab-content">
                  <!-- Specification Tab Content -->
                  {{ SPECIFICATION }}

                  <div class="item-description-icons">
                    <table>
                      // <tr data-spec="{{ MODEL }}">

                      //   <td>model</td>
                      // </tr>
                      // <tr data-spec="{{ OPERATINGSYSTEM }}">

                      //   <td>operating system</td>
                      // </tr>
                      // <tr data-spec="{{ SSDCAPACITY }}">

                      //   <td>ssd capacity</td>
                      // </tr>
                      // <tr data-spec="{{ STORAGETYPE }}">

                      //   <td>storage type</td>
                      // </tr>
                      // <tr data-spec="{{ FEATURES }}">

                      //   <td>features</td>
                      // </tr>
                      // <tr data-spec="{{ GPU }}">

                      //   <td>gpu</td>
                      // </tr>
                      // <tr data-spec="{{ TYPE  }}">

                      //   <td>type</td>
                      // </tr>
                      // <tr data-spec="{{ RELEASEYEAR }}">

                      //   <td>release year</td>
                      // </tr>
                      // <tr data-spec="{{ HARDDRIVECAPACITY }}">

                      //   <td>hard drive capacity</td>
                      // </tr>
                      // <tr data-spec="{{ COLOR }}">

                      //   <td>color</td>
                      // </tr>
                      // <tr data-spec="{{ MAXRESOLUTION }}">

                      //   <td>max resolution</td>
                      // </tr>
                      // <tr data-spec="{{ MOSTSUITABLEFOR }}">

                      //   <td>most suitable for</td>
                      // </tr>
                      // <tr data-spec="{{ WIFI }}">

                      //   <td>screen size</td>
                      // </tr>
                      // <tr data-spec="{{ GRAPHICSPROCESSINGTYPE }}">

                      //   <td>graphics processing type</td>
                      // </tr>
                      // <tr data-spec="{{ CONNECTIVITY }}">

                      //   <td>connectivity</td>
                      // </tr>
                      // <tr data-spec="{{ MOTHERBOARDMODEL }}">

                      //   <td>motherboard model</td>
                      // </tr>
                      // <tr data-spec="{{ SERIES }}">

                      //   <td>series</td>
                      // </tr>
                      // <tr data-spec="{{ OPERATINGSYSTEMEDITION }}">

                      //   <td>operating system edition</td>
                      // </tr>
                      // <tr data-spec="{{ MEMORY }}">

                      //   <td>memory</td>
                      // </tr>
                      // <tr data-spec="{{ MAXRAMCAPACITY }}">

                      //   <td>max ram capacity  </td>
                      // </tr>
                      // <tr data-spec="{{ UNITTYPE }}">

                      //   <td>unit type</td>
                      // </tr>
                      // <tr data-spec="{{ UNITQUANTITY }}">

                      //   <td>unit quantity</td>
                      // </tr>
                      // <tr data-spec="{{ MPN }}">

                      //   <td>mpn</td>
                      // </tr>
                      // <tr data-spec="{{ PROCESSORSPEED }}">

                      //   <td>processor speed</td>
                      // </tr>
                      //       <tr data-spec="{{ RAMSIZE }}">

                      //   <td>ram size</td>
                      // </tr>
                      // <tr data-spec="{{ FORMFACTOR }}">

                      //   <td>form factor</td>
                      // </tr>
                      // <tr data-spec="{{ EAN }}">

                      //   <td>ean</td>
                      // </tr>
                      // <tr data-spec="{{ PRODUCTTYPE }}">

                      //   <td>product type</td>
                      // </tr>
                      // <tr data-spec="{{ MANUFACTURERWARRANTY }}">

                      //   <td>manufacturer warranty</td>
                      // </tr>
                      // <tr data-spec="{{ REGIONOFMANUFACTURE }}">

                      //   <td>region of manufacture</td>
                      // </tr>
                      // <tr data-spec="{{ HEIGHT }}">

                      //   <td>height</td>
                      // </tr>
                      // <tr data-spec="{{ LENGTH }}">

                      //   <td>length</td>
                      // </tr>
                      // <tr data-spec="{{ WIDTH }}">

                      //   <td>width</td>
                      // </tr>
                      // <tr data-spec="{{ WEIGHT }}">

                      //   <td>weight</td>
                      // </tr>
                      // <tr data-spec="{{ NONNEWCONDITIONDETAILS }}">

                      //   <td>non new condition details</td>
                      // </tr>
                      // <tr data-spec="{{ PRODUCTCONDITION }}">

                      //   <td>product condition</td>
                      // </tr>
                      // <tr data-spec="{{ NUMBEROFLANPORTS }}">

                      //   <td>number of lan ports</td>
                      // </tr>
                      // <tr data-spec="{{ MAXIMUMWIRELESSDATA }}">

                      //   <td>maximum wireless data</td>
                      // </tr>
                      // <tr data-spec="{{ MAXIMUMLANDATARATE }}">

                      //   <td>maximum lan data rate</td>
                      // </tr>
                      // <tr data-spec="{{ PORTS }}">

                      //   <td>ports</td>
                      // </tr>
                      // <tr data-spec="{{ TOFIT }}">

                      //   <td>to fit</td>
                      // </tr>
                      // <tr data-spec="{{ DISPLAYTYPE }}">

                      //   <td>display type</td>
                      // </tr>
                      // <tr data-spec="{{ ASPECTRATIO }}">

                      //   <td>aspect ratio</td>
                      // </tr>
                      // <tr data-spec="{{ IMAGEBRIGHTNESS }}">

                      //     <td>image brightness</td>
                      // </tr>
                      // <tr data-spec="{{ THROWRATIO }}">

                      //   <td>throw ratio</td>
                      // </tr>
                      // <tr data-spec="{{ COMPATIBLEOPERATINGSYSTEM }}">

                      //   <td>compatible operating system</td>
                      // </tr>
                      // <tr data-spec="{{ COMPATIBLEFORMAT }}">

                      //   <td>compatible format</td>
                      // </tr>
                      // <tr data-spec="{{ LENSMAGNIFICATION }}">

                      //   <td>lens magnification</td>
                      // </tr>
                      // <tr data-spec="{{ YEARMANUFACTURED }}">

                      //   <td>year manufactured</td>
                      // </tr>
                      // <tr data-spec="{{ NATIVERESOLUTION }}">

                      //   <td>native resolution</td>
                      // </tr>
                      // <tr data-spec="{{ DISPLAYTECHNOLOGY }}">

                      //   <td>display technology</td>
                      // </tr>
                      // <tr data-spec="{{ ENERGYEFFICIENCYRATING }}">

                      //   <td>energy efficiency rating</td>
                      // </tr>
                      // <tr data-spec="{{ VIDEOINPUTS }}">

                      //   <td>video inputs</td>
                      // </tr>
                      // <tr data-spec="{{ REFRESHRATE }}">

                      //   <td>refresh rate</td>
                      // </tr>
                      // <tr data-spec="{{ RESPONSETIME }}">

                      //   <td>response time</td>
                      // </tr>
                      // <tr data-spec="{{ BRIGHTNESS }}">

                      //   <td>brightness</td>
                      // </tr>
                      // <tr data-spec="{{ CONTRASTRATIO }}">

                      //   <td>contrast ratio</td>
                      // </tr>
                      // <tr data-spec="{{ ECRANGE }}">

                      //   <td>ec range</td>
                      // </tr>
                      // <tr data-spec="{{ PRODUCTLINE }}">

                      //   <td>product line</td>
                      // </tr>
                      // <tr data-spec="{{ CUSTOMBUNDLE }}">

                      //   <td>custom bundle</td>
                      // </tr>
                      // <tr data-spec="{{ INTERFACE }}"></tr>

                      //   <td>interface</td>
                      // </tr>
                      // <tr data-spec="{{ NETWORKCONNECTIVITY }}">

                      //   <td>network connectivity</td>
                      //   </tr>
                      // <tr data-spec="{{ NETWORKMANAGEMENTTYPE }}">

                      //   <td>network management type</td>
                      // </tr>
                      // <tr data-spec="{{ NETWORKTYPE }}">

                      //   <td>network type</td>
                      // </tr>
                      // <tr data-spec="{{ PROCESSORMANUFACTURER }}">

                      //   <td>processor manufacturer</td>
                      // </tr>
                      // <tr data-spec="{{ NUMBEROFPROCESSORS }}">

                      //   <td>number of processors</td>
                      // </tr>
                      // <tr data-spec="{{ NUMBEROFVANPORTS }}">

                      //   <td>number of van ports</td>
                      // </tr>
                      // <tr data-spec="{{ PROCESSORTYPE }}">

                      //   <td>processor type</td>
                      // </tr>
                      // <tr data-spec="{{ RAIDLEVEL }}">

                      //   <td>raid level</td>
                      // </tr>
                      // <tr data-spec="{{ MEMORYTYPE }}"></tr>

                      //   <td>memory type</td>
                      // </tr>
                      // <tr data-spec="{{ DEVICECONNECTIVITY }}">

                      //   <td>device connectivity</td>
                      // </tr>
                      // <tr data-spec="{{ CONNECTORTYPE }}">

                      //   <td>connector type</td>
                      // </tr>
                      // <tr data-spec="{{ SUPPORTEDWIRELESSPROTOCOL }}">

                      //   <td>supported wireless protocol</td>
                      // </tr>
                      // <tr data-spec="{{ CALIFORNIAPROP65WARNING }}">

                      //   <td>california prop 65 warning</td>
                      // </tr>
                      // <tr data-spec="{{ YEARMANUFACTURED }}">

                      //   <td>year manufactured</td>
                      // </tr>
                      ${specsHtml}
                      </table>
                  </div>
                </div>

                <label for="tab-control-3" class="mobile-label">Warranty</label>
                <div id="tab-content-3" class="tab-content">
                  <!-- Warranty Tab Content -->
                  <link
                    type="text/css"
                    rel="stylesheet"
                    href="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/content/warranty.css"
                  />
                  <div class="warranty">
                  <table>
                      <tr data-spec="{{ WARRANTYDURATION }}">

                        <td>warranty duration</td>
                      </tr>
                      <tr data-spec="{{ WARRANTYCOVERAGE }}">

                        <td>warranty coverage</td>
                      </tr>
                      <tr data-spec="{{ WARRANTYDOCUMENT }}">

                        <td>warranty document</td>
                      </tr>
                  </table>
                  </div>
                </div>

                <label for="tab-control-4" class="mobile-label">Delivery</label>
                <div id="tab-content-4" class="tab-content">
                  <!-- Delivery Tab Content -->
                  <link
                    type="text/css"
                    rel="stylesheet"
                    href="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/content/delivery.css"
                  />
                  <div class="delivery">
                  <table>
                      <tr data-spec="{{ POSTAGEPOLICY }}">

                        <td>postage policy</td>
                      </tr>
                      <tr data-spec="{{ PACKAGEWEIGHT }}">

                          <td>package weight</td>
                      </tr>
                      <tr data-spec="{{ PACKAGEDIMENSIONS }}">

                        <td>package dimensions</td>
                      </tr>
                      <tr data-spec="{{ IRREGULARPACKAGE }}">

                        <td>irregular package</td>
                      </tr>
                   </table>
                  </div>
                </div>

                <label for="tab-control-5" class="mobile-label">Feedback</label>
                <div id="tab-content-5" class="tab-content">
                  <!-- Feedback Tab Content -->
                  <div class="feedbacks">
                    <h2 class="title">{{ ITEMTITLE }}</h2>
                    <div class="feedback clearfix">
                      <div class="icon"></div>
                      <div class="buyer">
                        <div class="name"></div>
                        <div class="brackets"><div class="score"></div></div>
                      </div>
                      <div class="date-label"><div class="date"></div></div>
                      <div class="description"></div>
                    </div>
                    <div class="feedback clearfix">
                      <div class="icon"></div>
                      <div class="buyer">
                        <div class="name"></div>
                        <div class="brackets"><div class="score"></div></div>
                      </div>
                      <div class="date-label"><div class="date"></div></div>
                      <div class="description"></div>
                    </div>
                    <div class="feedback clearfix">
                      <div class="icon"></div>
                      <div class="buyer">
                        <div class="name"></div>
                        <div class="brackets"><div class="score"></div></div>
                      </div>
                      <div class="date-label"><div class="date"></div></div>
                      <div class="description"></div>
                    </div>
                    <div class="feedback clearfix">
                      <div class="icon"></div>
                      <div class="buyer">
                        <div class="name"></div>
                        <div class="brackets"><div class="score"></div></div>
                      </div>
                      <div class="date-label"><div class="date"></div></div>
                      <div class="description"></div>
                    </div>
                    <div class="feedback clearfix">
                      <div class="icon"></div>
                      <div class="buyer">
                        <div class="name"></div>
                        <div class="brackets"><div class="score"></div></div>
                      </div>
                      <div class="date-label"><div class="date"></div></div>
                      <div class="description"></div>
                    </div>
                    <div class="feedback-button">
                      <input id="popup-opened" type="radio" name="popup" />
                      <input id="popup-closed" type="radio" name="popup" checked />

                      <label for="popup-opened" class="view-more">View more</label>

                      <div class="popup">
                        <div>
                          <div class="popup-header clearfix">
                            <label for="popup-closed">Close</label>
                          </div>
                          <div class="popup-body">
                            <h2 class="title">{{ ITEMTITLE }}</h2>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="latest-feedbacks">
                    <h2>Read what our buyers say about us...</h2>
                    <div class="feedback clearfix">
                      <div class="icon"></div>
                      <div class="buyer">
                        <div class="name"></div>
                        <div class="brackets"><div class="score"></div></div>
                      </div>
                      <div class="date-label"><div class="date"></div></div>
                      <div class="description"></div>
                      <div class="title"></div>
                    </div>
                    <div class="feedback clearfix">
                      <div class="icon"></div>
                      <div class="buyer">
                        <div class="name"></div>
                        <div class="brackets"><div class="score"></div></div>
                      </div>
                      <div class="date-label"><div class="date"></div></div>
                      <div class="description"></div>
                      <div class="title"></div>
                    </div>
                    <div class="feedback clearfix">
                      <div class="icon"></div>
                      <div class="buyer">
                        <div class="name"></div>
                        <div class="brackets"><div class="score"></div></div>
                      </div>
                      <div class="date-label"><div class="date"></div></div>
                      <div class="description"></div>
                      <div class="title"></div>
                    </div>
                    <div class="feedback clearfix">
                      <div class="icon"></div>
                      <div class="buyer">
                        <div class="name"></div>
                        <div class="brackets"><div class="score"></div></div>
                      </div>
                      <div class="date-label"><div class="date"></div></div>
                      <div class="description"></div>
                      <div class="title"></div>
                    </div>
                    <div class="feedback clearfix">
                      <div class="icon"></div>
                      <div class="buyer">
                        <div class="name"></div>
                        <div class="brackets"><div class="score"></div></div>
                      </div>
                      <div class="date-label"><div class="date"></div></div>
                      <div class="description"></div>
                      <div class="title"></div>
                    </div>
                    <div class="feedback-button">
                      <input id="popup-opened-2" type="radio" name="popup-2" />
                      <input id="popup-closed-2" type="radio" name="popup-2" checked />

                      <label for="popup-opened-2" class="view-more">View more</label>

                      <div class="popup">
                        <div>
                          <div class="popup-header clearfix">
                            <label for="popup-closed-2">Close</label>
                          </div>
                          <div class="popup-body">
                            <h2>Read what our buyers say about us...</h2>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                            <div class="feedback clearfix">
                              <div class="icon"></div>
                              <div class="buyer">
                                <div class="name"></div>
                                <div class="brackets"><div class="score"></div></div>
                              </div>
                              <div class="date-label"><div class="date"></div></div>
                              <div class="description"></div>
                              <div class="title"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="clearfix"></div>
              </div>

              <div class="box-products best-sellers">
                <h2><!-- content --></h2>
                <div class="products row clearfix">
                  <div class="product col-xs-6 col-md-3">
                    <a
                      target="_blank"
                      href="https://www.ebay.co.uk/str/midlandsav/-/_i.html?store_cat={{ DEFAULTEBAYSTORECATEGORYID }}"
                    >
                      <div class="image">
                        <div class="enlarge"><div class="image"></div></div>
                      </div>
                      <div class="title"></div>
                      <div class="rrp"></div>
                      <div class="price"></div>
                      <div class="view"></div>
                    </a>
                  </div>
                  <div class="product col-xs-6 col-md-3">
                    <a
                      target="_blank"
                      href="https://www.ebay.co.uk/str/midlandsav/-/_i.html?store_cat={{ DEFAULTEBAYSTORECATEGORYID }}"
                    >
                      <div class="image">
                        <div class="enlarge"><div class="image"></div></div>
                      </div>
                      <div class="title"></div>
                      <div class="rrp"></div>
                      <div class="price"></div>
                      <div class="view"></div>
                    </a>
                  </div>
                  <div class="product col-xs-6 col-md-3">
                    <a
                      target="_blank"
                      href="https://www.ebay.co.uk/str/midlandsav/-/_i.html?store_cat={{ DEFAULTEBAYSTORECATEGORYID }}"
                    >
                      <div class="image">
                        <div class="enlarge"><div class="image"></div></div>
                      </div>
                      <div class="title"></div>
                      <div class="rrp"></div>
                      <div class="price"></div>
                      <div class="view"></div>
                    </a>
                  </div>
                  <div class="product col-xs-6 col-md-3">
                    <a
                      target="_blank"
                      href="https://www.ebay.co.uk/str/midlandsav/-/_i.html?store_cat={{ DEFAULTEBAYSTORECATEGORYID }}"
                    >
                      <div class="image">
                        <div class="enlarge"><div class="image"></div></div>
                      </div>
                      <div class="title"></div>
                      <div class="rrp"></div>
                      <div class="price"></div>
                      <div class="view"></div>
                    </a>
                  </div>
                </div>
                <div class="action">
                  <a
                    target="_blank"
                    href="https://www.ebay.co.uk/str/midlandsav/-/_i.html?store_cat={{ DEFAULTEBAYSTORECATEGORYID }}"
                    ><!-- content --></a
                  >
                </div>
              </div>

              <div class="featured">
                <div class="heading">
                  <!-- content -->
                </div>

                <input type="radio" name="featured-push" id="featured-push1" class="push" checked="" />
                <label for="featured-push1" class="left one"></label>

                <input type="radio" name="featured-push" id="featured-push2" class="push" />
                <label for="featured-push2" class="right one"></label>

                <div class="featured-container">
                  <div class="row">
                    <div class="col-xs-6 col-lg-3">
                      <a href="https://www.ebay.co.uk/str/midlandsav/-/_i.html?store_cat=20334827015" target="_blank">
                        <img
                          src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/cat-1.jpg"
                        />
                        <div class="content">
                          <h3>All In One PCs</h3>
                          <span><!-- content --></span>
                        </div>
                      </a>
                    </div>
                    <div class="col-xs-6 col-lg-3">
                      <a
                        href="https://www.ebay.co.uk/str/midlandsav/Computers/_i.html?store_cat=18516552015"
                        target="_blank"
                      >
                        <img
                          src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/cat-6.jpg"
                        />
                        <div class="content">
                          <h3>Computers</h3>
                          <span><!-- content --></span>
                        </div>
                      </a>
                    </div>
                    <div class="col-xs-6 col-lg-3">
                      <a href="https://www.ebay.co.uk/str/midlandsav/-/_i.html?store_cat=18516558015" target="_blank">
                        <img
                          src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/cat-3.jpg"
                        />
                        <div class="content">
                          <h3>Gaming PC Bundles</h3>
                          <span><!-- content --></span>
                        </div>
                      </a>
                    </div>
                    <div class="col-xs-6 col-lg-3">
                      <a href="https://www.ebay.co.uk/str/midlandsav/-/_i.html?store_cat=18516553015" target="_blank">
                        <img
                          src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/cat-2.jpg"
                        />
                        <div class="content">
                          <h3>Laptops</h3>
                          <span><!-- content --></span>
                        </div>
                      </a>
                    </div>
                    <div class="col-xs-6 col-lg-3">
                      <a
                        href="https://www.ebay.co.uk/str/midlandsav/Monitors/_i.html?store_cat=18516554015"
                        target="_blank"
                      >
                        <img
                          src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/cat-5.jpg"
                        />
                        <div class="content">
                          <h3>Monitors</h3>
                          <span><!-- content --></span>
                        </div>
                      </a>
                    </div>
                    <div class="col-xs-6 col-lg-3">
                      <a
                        href="https://www.ebay.co.uk/str/midlandsav/Network-Equipment/_i.html?store_cat=20334836015"
                        target="_blank"
                      >
                        <img
                          src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/cat-4.jpg"
                        />
                        <div class="content">
                          <h3>Network Equipment</h3>
                          <span><!-- content --></span>
                        </div>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="footer" class="section">
        <div class="container">
          <div class="row">
            <div class="col-xs-5 col-md-3">
              <div class="subheading">Quick Links</div>
              <ul>
                <li>
                  <a target="_blank" href="https://www.ebay.co.uk/str/midlandsav">Home</a>
                </li>
                <li>
                  <a target="_blank" href="https://www.ebay.co.uk/str/midlandsav?_tab=about">About Us</a>
                </li>
                <li>
                  <a target="_blank" href="https://www.ebay.co.uk/str/midlandsav?_tab=feedback">Feedback</a>
                </li>
                <li>
                  <a
                    target="_blank"
                    href="https://contact.ebay.co.uk/ws/eBayISAPI.dll?FindAnswers&requested=birmingham-av"
                    >Contact Us</a
                  >
                </li>
              </ul>
            </div>
            <div class="col-xs-7 col-md-4">
              <div class="subheading">Secure Payment</div>
              <p><!-- content --></p>
              <img src="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/images/cards.png" />
            </div>
            <div class="col-xs-12 col-md-5">
              <a target="_blank" href="https://www.ebay.co.uk/str/midlandsav" class="btn-footer"><!-- content --></a>
            </div>
          </div>
        </div>
      </div>

      <!-- © COPYRIGHT: Do not remove -->
      <div id="footer-sub" class="section">
        <div class="container">
          <div title="eBay &amp; Ecommerce Stores By Studioworx" class="copyright studioworx">
            <span>eBay &amp; Ecommerce Stores By</span>
            <img
              src="https://ebaydesigns-studioworx.elist.store/clients/0001_global_framework/images/studioworx.gif"
              alt="eBay &amp; Ecommerce Stores By Studioworx"
            />
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
  `;

  const templateData = {

    ITEMTITLE: data.title,
    IMAGE01: data.imageUrls[0],
    IMAGE02: data.imageUrls[1],
    IMAGE03: data.imageUrls[2],
    IMAGE04: data.imageUrls[3],
    IMAGE05: data.imageUrls[4],
    IMAGE06: data.imageUrls[5],
    IMAGE07: data.imageUrls[6],
    IMAGE08: data.imageUrls[7],
    ITEMDESCRIPTION: data.description,
    DEFAULTEBAYSTORECATEGORYID: data.categoryId,
    STOREFRONTPRICE: data?.prodPricing?.retailPrice ?? data?.prodPricing?.selectedVariations?.[0]?.retailPrice ?? 0,
    CPU: data.prodTechInfo?.cpu,
    GPU: data.prodTechInfo?.gpu,
    RAM: data.prodTechInfo?.ram,
    STORAGE: data.prodTechInfo?.storage,
    POWER: data.prodTechInfo?.power,


    PROCESSOR: data.prodTechInfo?.processor,
    MODEL: data.prodTechInfo?.model,
    OPERATINGSYSTEM: data.prodTechInfo?.operatingSystem,
    STORAGETYPE: data.prodTechInfo?.storageType,
    FEATURES: data.prodTechInfo?.features,
    SSDCAPACITY: data.prodTechInfo?.ssdCapacity,
    TYPE: data.prodTechInfo?.type,
    RELEASEYEAR: data.prodTechInfo?.releaseYear,



    HARDDRIVECAPACITY: data.prodTechInfo?.hardDriveCapacity,
    COLOR: data.prodTechInfo?.color,
    MAXRESOLUTION: data.prodTechInfo?.maxResolution,
    MOSTSUITABLEFOR: data.prodTechInfo?.mostSuitableFor,
    SCREENSIZE: data.prodTechInfo?.screenSize,
    GRAPHICSPROCESSINGTYPE: data.prodTechInfo?.graphicsProcessingType,
    CONNECTIVITY: data.prodTechInfo?.connectivity,
    MOTHERBOARDMODEL: data.prodTechInfo?.motherboardModel,
    SERIES: data.prodTechInfo?.series,
    OPERATINGSYSTEMEDITION: data.prodTechInfo?.operatingSystemEdition,
    MEMORY: data.prodTechInfo?.memory,
    MAXRAMCAPACITY: data.prodTechInfo?.maxRamCapacity,
    UNITTYPE: data.prodTechInfo?.unitType,
    UNITQUANTITY: data.prodTechInfo?.unitQuantity,
    MPN: data.prodTechInfo?.mpn,
    PROCESSORSPEED: data.prodTechInfo?.processorSpeed,
    RAMSIZE: data.prodTechInfo?.ramSize,
    FORMFACTOR: data.prodTechInfo?.formFactor,
    EAN: data.prodTechInfo?.ean.map((ean:any) => ean.toString()),
    PRODUCTTYPE: data.prodTechInfo?.productType,
    MANUFACTURERWARRANTY: data.prodTechInfo?.manufacturerWarranty,
    REGIONOFMANUFACTURE: data.prodTechInfo?.regionOfManufacture,
    HEIGHT: data.prodTechInfo?.height,
    LENGTH: data.prodTechInfo?.length,
    WIDTH: data.prodTechInfo?.width,
    WEIGHT: data.prodTechInfo?.weight,
    NONNEWCONDITIONDETAILS: data.prodTechInfo?.nonNewConditionDetails,
    PRODUCTCONDITION: data.prodTechInfo?.productCondition,
    NUMBEROFLANPORTS: data.prodTechInfo?.numberOfLanPorts,
    MAXIMUMWIRELESSDATA: data.prodTechInfo?.maximumWirelessData,
    MAXIMUMLANDATARATE: data.prodTechInfo?.maximumLanDataRate,
    PORTS: data.prodTechInfo?.ports,
    TOFIT: data.prodTechInfo?.toFit,
    DISPLAYTYPE: data.prodTechInfo?.displayType,
    ASPECTRATIO: data.prodTechInfo?.aspectRatio,
    IMAGEBRIGHTNESS: data.prodTechInfo?.imageBrightness,
    THROWRATIO: data.prodTechInfo?.throwRatio,
    COMPATIBLEOPERATINGSYSTEM: data.prodTechInfo?.compatibleOperatingSystem,
    COMPATIBLEFORMAT: data.prodTechInfo?.compatibleFormat,
    LENSMAGNIFICATION: data.prodTechInfo?.lensMagnification,
    YEARMANUFACTURED: data.prodTechInfo?.yearManufactured,
    NATIVERESOLUTION: data.prodTechInfo?.nativeResolution,
    DISPLAYTECHNOLOGY: data.prodTechInfo?.displayTechnology,
    ENERGYEFFICIENCYRATING: data.prodTechInfo?.energyEfficiencyRating,
    VIDEOINPUTS: data.prodTechInfo?.videoInputs,
    REFRESHRATE: data.prodTechInfo?.refreshRate,
    RESPONSETIME: data.prodTechInfo?.responseTime,
    BRIGHTNESS: data.prodTechInfo?.brightness,
    CONTRASTRATIO: data.prodTechInfo?.contrastRatio,
    ECRANGE: data.prodTechInfo?.ecRange,
    PRODUCTLINE: data.prodTechInfo?.productLine,
    CUSTOMBUNDLE: data.prodTechInfo?.customBundle,
    INTERFACE: data.prodTechInfo?.interface,
    NETWORKCONNECTIVITY: data.prodTechInfo?.networkConnectivity,
    NETWORKMANAGEMENTTYPE: data.prodTechInfo?.networkManagementType,
    NETWORKTYPE: data.prodTechInfo?.networkType,
    PROCESSORMANUFACTURER: data.prodTechInfo?.processorManufacturer,
    NUMBEROFPROCESSORS: data.prodTechInfo?.numberOfProcessors,
    NUMBEROFVANPORTS: data.prodTechInfo?.numberOfVanPorts,
    PROCESSORTYPE: data.prodTechInfo?.processorType,
    RAIDLEVEL: data.prodTechInfo?.raidLevel,
    MEMORYTYPE: data.prodTechInfo?.memoryType,
    DEVICECONNECTIVITY: data.prodTechInfo?.deviceConnectivity,
    CONNECTORTYPE: data.prodTechInfo?.connectorType,
    SUPPORTEDWIRELESSPROTOCOL: data.prodTechInfo?.supportedWirelessProtocol,
    COMPATIBLEOPERATINGSYSTEMS: data.prodTechInfo?.compatibleOperatingSystems,
    CALIFORNIAPROP65WARNING: data.prodTechInfo?.californiaProp65Warning,
    WARRANTYDURATION: data.prodPricing?.warrantyDuration,
    WARRANTYCOVERAGE: data.prodPricing?.warrantyCoverage,
    WARRANTYDOCUMENT: data.prodPricing?.warrantyDocument,
    POSTAGEPOLICY: data.prodDelivery?.postagePolicy,
    PACKAGEWEIGHT: data.prodDelivery?.packageWeight,
    PACKAGEDIMENSIONS: data.prodDelivery?.packageDimensions,
    IRREGULARPACKAGE: data.prodDelivery?.irregularPackage,




  };

  // Replace placeholders in the HTML template with actual data
  let populatedHtml = htmlData;

  // Loop over the template data and replace the placeholders
  for (const [key, value] of Object.entries(templateData)) {
    const placeholder = `{{ ${key} }}`;
    populatedHtml = populatedHtml.replace(new RegExp(placeholder, "g"), value);
  }

  // Return the populated HTML
  return populatedHtml;
};

export default ebayHtmlTemplate;
