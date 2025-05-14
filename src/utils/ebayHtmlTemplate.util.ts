// ebayHtmlTemplate.util.ets
const ebayHtmlTemplate = (data: any) => {
  // Function to create table rows from attribute list
  const generateSpecsRows = (specs: { name: string; value: any }[]) => {
    return specs
      .map(
        ({ name, value }) => `
      <tr data-spec="${name}">
        <td><strong>${name}</strong></td>
        <td>${value}</td>
      </tr>`
      )
      .join("");
  };

  // Use pre-processed attributes passed in
  const attributeList = Array.isArray(data.attributes) ? data.attributes : [];

  // Generate the HTML table rows from the passed attributes
  const specsRows = generateSpecsRows(attributeList);

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
                        ${specsRows}
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
                      ${specsRows}
                     </table>
                  </div>
                </div>

               <label for="tab-control-3" class="mobile-label">Warranty</label>
								<div id="tab-content-3" class="tab-content">
									<!-- Warranty Tab Content -->
									<link type="text/css" rel="stylesheet" href="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/content/warranty.css" />
									<div class="warranty">
										<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
										<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
									</div>
								</div>

								<label for="tab-control-4" class="mobile-label">Delivery</label>
								<div id="tab-content-4" class="tab-content">
									<!-- Delivery Tab Content -->
									<link type="text/css" rel="stylesheet" href="https://ebaydesigns-studioworx.elist.store/clients/0449birminghamva/listing/content/delivery.css" />
									<div class="delivery">
										<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
										<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
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

  const templateData: any = {
    ITEMTITLE: data.title,

    ITEMDESCRIPTION: data.description,
    DEFAULTEBAYSTORECATEGORYID: data.categoryId,
    STOREFRONTPRICE: data.retailPrice,
  };
  (data.imageUrls || []).forEach((url: string, index: number) => {
    const imageKey = `IMAGE0${index + 1}`; // IMAGE01, IMAGE02, ...
    templateData[imageKey] = url;
  });

  // Replace all placeholders in the HTML
  let populatedHtml = htmlData;
  for (const [key, value] of Object.entries(templateData)) {
    populatedHtml = populatedHtml.replace(new RegExp(`{{ ${key} }}`, "g"), String(value));
  }
  return populatedHtml;
};

export default ebayHtmlTemplate;
