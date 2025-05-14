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
  // Function to generate image section HTML dynamically
  const generateImageSection = (imageUrls: string[]) => {
    return imageUrls
      .map((imageUrl, index) => {
        const nextIndex = index + 1;
        const prevIndex = index - 1;

        return `
        <div class="image" data-image="{{ IMAGE${nextIndex} }}">
          <input id="thumbnail-control-${nextIndex}" type="radio" name="thumbnails" class="thumbnails-control" ${index === 0 ? "checked" : ""} />
          <label for="thumbnail-control-${nextIndex}" id="thumbnail-${nextIndex}" class="thumbnail" data-checkimage2="{{ IMAGE${nextIndex + 1} }}">
            <img src="{{ IMAGE${nextIndex} }}" alt="Thumbnail ${nextIndex}" class="img-center" />
          </label>

          <input id="image-control-${nextIndex}" type="checkbox" class="main-control" />
          <label for="image-control-${nextIndex}" id="image-${nextIndex}" class="main transition">
            <div class="main-content">
              <img src="{{ IMAGE${nextIndex} }}" alt="{{ ITEMTITLE }}" class="img-center" />
              <label for="thumbnail-control-${prevIndex + 1}" data-prev="{{ IMAGE${prevIndex} }}" class="prev"></label>
              <label for="thumbnail-control-${nextIndex + 1}" data-next="{{ IMAGE${nextIndex + 1} }}" class="next"></label>
            </div>
          </label>
        </div>

      `;
      })

      .join("");
  };
  // Generate image HTML dynamically
  const imageSection = generateImageSection(data.imageUrls || []);
  console.log("imageSection", imageSection);
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
                       ${imageSection}
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
