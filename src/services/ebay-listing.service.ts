// import { IEbay } from "@/contracts/ebay.contract";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { Request, Response } from "express";
import ebayHtmlTemplate from "@/utils/ebayHtmlTemplate.util";
import {
  exchangeCodeForAccessToken,
  getEbayAuthURL,
  getNormalAccessToken,
  getStoredEbayAccessToken,
  refreshEbayAccessToken,
} from "@/utils/ebay-helpers.util";

export const ebayListingService = {
  getApplicationAuthToken: async (req: Request, res: Response) => {
    try {
      const credentials = await getNormalAccessToken();
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        credentials,
      });
    } catch (error) {
      // console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get application token",
        details: error,
      });
    }
  },

  getUserAuthorizationUrl: async (req: Request, res: Response) => {
    try {
      const authUrl = getEbayAuthURL();
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        authUrl,
      });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get user authorization URL",
        details: error,
      });
    }
  },

  handleAuthorizationCallback: async (req: Request, res: Response) => {
    try {
      const { code } = req.query;
      const accessToken = await exchangeCodeForAccessToken(code as string);
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        accessToken,
      });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to exchange code for access token",
        details: error,
      });
    }
  },

  handleFallbackCallback: async (req: Request, res: Response) => {
    try {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: StatusCodes.UNAUTHORIZED,
        message: ReasonPhrases.UNAUTHORIZED,
        error: "User denied access to eBay account",
      });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to handle fallback callback",
        details: error,
      });
    }
  },

  handleRefreshToken: async (req: Request, res: Response) => {
    try {
      const credentials = await refreshEbayAccessToken();
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        credentials,
      });
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get application token",
        details: error,
      });
    }
  },

  async syncListingWithEbay(listing: any): Promise<string> {
    try {
      const token = await getStoredEbayAccessToken();
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }

      const ebayData = listing;

      const generateListingDescription = (ebayData: any) => {
        return ebayHtmlTemplate({
          title: ebayData.productInfo?.title ?? "A TEST product",
          brand: ebayData.productInfo?.brand || "Mix Brand",
          processor: ebayData.prodTechInfo?.processor || "Core I9",
          ram: ebayData.prodTechInfo?.ramSize || "16 GB",
          storage: ebayData.prodTechInfo?.storageType || "SSD",
          formFactor: ebayData.prodTechInfo?.formFactor || "Unknown",
          gpu: ebayData.prodTechInfo?.gpu || "Nvidia RTX 3060",
          screenSize: ebayData.prodTechInfo?.screenSize || "Unknown",
          resolution: ebayData.prodTechInfo?.resolution || "Unknown",
          frequency: ebayData.prodTechInfo?.frequency || "Unknown",
          connectivity: ebayData.prodTechInfo?.connectivity || "Unknown",
          description: ebayData.productInfo?.description || "No description available.",
          imageUrls: ebayData.prodMedia?.images?.map((img: any) => img.url) ?? [],
          weightUnit: "POUND",
          ean: ebayData.prodTechInfo?.ean.map((ean: any) => ean) ?? [],
          mpn: ebayData.prodTechInfo?.mpn,
          upc: ebayData.prodTechInfo?.upc,
          model: ebayData.prodTechInfo?.model,
          operatingSystem: ebayData.prodTechInfo?.operatingSystem,
          storageType: ebayData.prodTechInfo?.storageType,
          features: ebayData.prodTechInfo?.features,
          ssdCapacity: ebayData.prodTechInfo?.ssdCapacity,
          type: ebayData.prodTechInfo?.type,
          releaseYear: ebayData.prodTechInfo?.releaseYear,
          hardDriveCapacity: ebayData.prodTechInfo?.hardDriveCapacity,
          color: ebayData.prodTechInfo?.color,
          maxResolution: ebayData.prodTechInfo?.maxResolution,
          mostSuitableFor: ebayData.prodTechInfo?.mostSuitableFor.map((suitable: any) => suitable) ?? [],
          graphicsProcessingType: ebayData.prodTechInfo?.graphicsProcessingType,
          motherboardModel: ebayData.prodTechInfo?.motherboardModel,
          series: ebayData.prodTechInfo?.series,
          operatingSystemEdition: ebayData.prodTechInfo?.operatingSystemEdition,
          memory: ebayData.prodTechInfo?.memory,
          maxRamCapacity: ebayData.prodTechInfo?.maxRamCapacity,
          unitType: ebayData.prodTechInfo?.unitType,
          unitQuantity: ebayData.prodTechInfo?.unitQuantity,
          processorSpeed: ebayData.prodTechInfo?.processorSpeed,
          ramSize: ebayData.prodTechInfo?.ramSize,
          productType: ebayData.prodTechInfo?.productType,
          manufacturerWarranty: ebayData.prodPricing?.manufacturerWarranty,
          regionOfManufacture: ebayData.prodTechInfo?.regionOfManufacture,
          height: ebayData.prodTechInfo?.height || "Unknown",
          length: ebayData.prodTechInfo?.length || "Unknown",
          width: ebayData.prodTechInfo?.width || "Unknown",
          weight: ebayData.prodTechInfo?.weight || "Unknown",
          nonNewConditionDetails: ebayData.prodTechInfo?.nonNewConditionDetails,
          productCondition: ebayData.prodTechInfo?.productCondition,
          numberOfLANPorts: ebayData.prodTechInfo?.numberOfLANPorts,
          maximumWirelessData: ebayData.prodTechInfo?.maximumWirelessData,
          maximumLANDataRate: ebayData.prodTechInfo?.maximumLANDataRate,
          ports: ebayData.prodTechInfo?.ports,
          toFit: ebayData.prodTechInfo?.toFit.map((fit: any) => fit) ?? [],
          displayType: ebayData.prodTechInfo?.displayType,
          aspectRatio: ebayData.prodTechInfo?.aspectRatio,
          imageBrightness: ebayData.prodTechInfo?.imageBrightness,
          throwRatio: ebayData.prodTechInfo?.throwRatio,
          compatibleOperatingSystem: ebayData.prodTechInfo?.compatibleOperatingSystem,
          compatibleFormat: ebayData.prodTechInfo?.compatibleFormat,
          lensMagnification: ebayData.prodTechInfo?.lensMagnification,
          nativeResolution: ebayData.prodTechInfo?.nativeResolution,
          displayTechnology: ebayData.prodTechInfo?.displayTechnology,
          energyEfficiencyRating: ebayData.prodTechInfo?.energyEfficiencyRating,
          videoInputs: ebayData.prodTechInfo?.videoInputs,
          refreshRate: ebayData.prodTechInfo?.refreshRate,
          responseTime: ebayData.prodTechInfo?.responseTime,
          brightness: ebayData.prodTechInfo?.brightness,
          contrastRatio: ebayData.prodTechInfo?.contrastRatio,
          ecRange: ebayData.prodTechInfo?.ecRange,
          productLine: ebayData.prodTechInfo?.productLine,
          customBundle: ebayData.prodTechInfo?.customBundle,
          interface: ebayData.prodTechInfo?.interface,
          networkConnectivity: ebayData.prodTechInfo?.networkConnectivity,
          networkManagementType: ebayData.prodTechInfo?.networkManagementType,
          networkType: ebayData.prodTechInfo?.networkType,
          processorManufacturer: ebayData.prodTechInfo?.processorManufacturer,
          numberOfProcessors: ebayData.prodTechInfo?.numberOfProcessors,
          numberOfVANPorts: ebayData.prodTechInfo?.numberOfVANPorts,
          processorType: ebayData.prodTechInfo?.processorType,
          raidLevel: ebayData.prodTechInfo?.raidLevel,
          memoryType: ebayData.prodTechInfo?.memoryType,
          deviceConnectivity: ebayData.prodTechInfo?.deviceConnectivity,
          connectorType: ebayData.prodTechInfo?.connectorType,
          supportedWirelessProtocol: ebayData.prodTechInfo?.supportedWirelessProtocol,
          compatibleOperatingSystems: ebayData.prodTechInfo?.compatibleOperatingSystems,
          californiaProp65Warning: ebayData.prodTechInfo?.californiaProp65Warning,
          yearManufactured: ebayData.prodTechInfo?.yearManufactured,
          warrantyDuration: ebayData.prodPricing?.warrantyDuration,
          warrantyCoverage: ebayData.prodPricing?.warrantyCoverage,
          warrantyDocument: ebayData.prodPricing?.warrantyDocument,
          postagePolicy: ebayData.prodDelivery?.postagePolicy,
          packageWeight: ebayData.prodDelivery?.packageWeight,
          packageDimensions: ebayData.prodDelivery?.packageDimensions,
          irregularPackage: ebayData.prodDelivery?.irregularPackage,
        });
      };

      const listingDescriptionData = generateListingDescription(ebayData);
      if (!ebayData) {
        throw new Error("Missing eBay listing details");
      }

      // Use listing._id as the SKU (or replace with the correct ID field)
      const sku = listing._id?.toString();
      const ebayUrl = `https://api.ebay.com/sell/inventory/v1/inventory_item/${sku}`;
      const baseURL = "https://api.ebay.com";
      const inventoryBody = {
        product: {
          title: ebayData.productInfo?.title ?? "A TEST product",
          // "brand": "string",
          aspects: {
            Feature: ebayData.prodTechInfo?.features ? [ebayData.prodTechInfo.features] : ["bluetooth"],
            ...(ebayData.prodTechInfo?.cpu && ebayData.prodTechInfo.cpu.trim()
              ? { CPU: [ebayData.prodTechInfo.cpu] }
              : {}),
          },
          // "aspects": "string",
          description: ebayData.productInfo?.description
            ? ebayData.productInfo.description.replace(/[\[\]]/g, "")
            : "No description available.",
          upc: ebayData.prodTechInfo?.upc,
          imageUrls: ebayData.prodMedia?.images?.map((img: any) => img.url) ?? [],

          ean: ebayData.prodTechInfo?.ean.map((ean: any) => ean) ?? [],
          // "epid": "string",

          // "isbn": [
          //   "string"
          // ],
          mpn: ebayData.prodTechInfo?.mpn,
          // "subtitle": "string",

          videoIds: ebayData.prodMedia?.videos?.map((video: any) => video.url) ?? [],
        },
        condition: "NEW",
        // "condition": "ConditionEnum : [NEW,LIKE_NEW,NEW_OTHER,NEW_WITH_DEFECTS,MANUFACTURER_REFURBISHED,CERTIFIED_REFURBISHED,EXCELLENT_REFURBISHED,VERY_GOOD_REFURBISHED,GOOD_REFURBISHED,SELLER_REFURBISHED,USED_EXCELLENT,USED_VERY_GOOD,USED_GOOD,USED_ACCEPTABLE,FOR_PARTS_OR_NOT_WORKING,PRE_OWNED_EXCELLENT,PRE_OWNED_FAIR]",
        packageWeightAndSize: {
          dimensions: {
            height: parseFloat(ebayData.prodTechInfo?.height) || 5,
            length: parseFloat(ebayData.prodTechInfo?.length) || 10,
            width: parseFloat(ebayData.prodTechInfo?.width) || 15,
            unit: "INCH",
          },
          weight: {
            value: parseFloat(ebayData.prodTechInfo?.weight) || 2,
            unit: "POUND",
          },

          // "packageType": "PackageTypeEnum : [LETTER,BULKY_GOODS,CARAVAN,CARS,EUROPALLET,EXPANDABLE_TOUGH_BAGS,EXTRA_LARGE_PACK,FURNITURE,INDUSTRY_VEHICLES,LARGE_CANADA_POSTBOX,LARGE_CANADA_POST_BUBBLE_MAILER,LARGE_ENVELOPE,MAILING_BOX,MEDIUM_CANADA_POST_BOX,MEDIUM_CANADA_POST_BUBBLE_MAILER,MOTORBIKES,ONE_WAY_PALLET,PACKAGE_THICK_ENVELOPE,PADDED_BAGS,PARCEL_OR_PADDED_ENVELOPE,ROLL,SMALL_CANADA_POST_BOX,SMALL_CANADA_POST_BUBBLE_MAILER,TOUGH_BAGS,UPS_LETTER,USPS_FLAT_RATE_ENVELOPE,USPS_LARGE_PACK,VERY_LARGE_PACK,WINE_PAK]",
          // "shippingIrregular": "boolean",
        },
        availability: {
          shipToLocationAvailability: {
            quantity: parseInt(ebayData.prodPricing?.listingQuantity) || 10,
          },
          // "availabilityDistributions": [
          //   {
          //     "fulfillmentTime": {
          //       "unit": "TimeDurationUnitEnum : [YEAR,MONTH,DAY,HOUR,CALENDAR_DAY,BUSINESS_DAY,MINUTE,SECOND,MILLISECOND]",
          //       "value": "integer"
          //     },
          //     "merchantLocationKey": "string",
          //     "quantity": "integer"
          //   }
          // ],

          // "pickupAtLocationAvailability": [
          //   {
          //     "availabilityType": "AvailabilityTypeEnum : [IN_STOCK,OUT_OF_STOCK,SHIP_TO_STORE]",
          //     "fulfillmentTime": {
          //       "unit": "TimeDurationUnitEnum : [YEAR,MONTH,DAY,HOUR,CALENDAR_DAY,BUSINESS_DAY,MINUTE,SECOND,MILLISECOND]",
          //       "value": "integer"
          //     },
          //     "merchantLocationKey": "string",
          //     "quantity": "integer"
          //   }
          // ],
        },

        // "conditionDescription": "string",
        // "conditionDescriptors": [
        //   {
        //     "additionalInfo": "string",
        //     "name": "string",
        //     "values": [
        //       "string"
        //     ]
        //   }
        // ],
        fulfillmentTime: { value: 1, unit: "BUSINESS_DAY" },
        shippingOptions: [
          {
            shippingCost: { value: "0.00", currency: "USD" },
            shippingServiceCode: "USPSPriorityMail",
            shipToLocations: [{ countryCode: "US" }],
            packageType: "USPSPriorityMailFlatRateBox",
          },
        ],
        listingPolicies: {
          fulfillmentPolicyId: "247178000010",
          paymentPolicyId: "247178015010",
          returnPolicyId: "247178019010",
        },
      };

      console.log("Request Body for Inventory Creation:", JSON.stringify(inventoryBody, null, 2));

      // Step 1: Create Inventory on eBay
      const response = await fetch(ebayUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "Content-Language": "en-US",
          "Accept-Language": "en-US",
        },
        body: JSON.stringify(inventoryBody),
      });

      const responseText = await response.text();


      // console.log("ebayData.publishtoebay", listing?.publishToEbay);

      // Determine the retail price
      const retailPrice =
        ebayData?.prodPricing?.retailPrice ?? ebayData?.prodPricing?.selectedVariations?.[0]?.retailPrice ?? 0;

      // Step 2: If the listing status is 'published', create the offer
      if (listing.status === "published") {
        // Define categoryId based on listing.kind
        let categoryId;

        switch (listing.kind) {
          case "listing_laptops":
            categoryId = 177;
            break;
          case "listing_all_in_one_pc":
            categoryId = 179;
            break;
          case "listing_projectors":
            categoryId = 25321;
            break;
          case "listing_monitors":
            categoryId = 80053;
            break;
          case "listing_gaming_pc":
            categoryId = 179;
            break;
          case "listing_network_equipments":
            categoryId = 175709;
            break;
          default:
            categoryId = 177;
        }
        const offerBody = {
          sku: listing._id,
          brand: ebayData.productInfo?.brand || "Mix Brand",
          processor: ebayData.prodTechInfo?.processor || "Unknown",
          ram: ebayData.prodTechInfo?.ramSize || "Unknown",
          storage: ebayData.prodTechInfo?.storageType || "SSD",
          FormFactor: ebayData.prodTechInfo?.formFactor || "Unknown",
          gpu: ebayData?.prodTechInfo?.gpu || "Unknown",
          screenSize: ebayData.prodTechInfo?.screenSize || "Unknown",
          resolution: ebayData?.prodTechInfo?.resolution || "Unknown",
          lumens: ebayData?.prodTechInfo?.lumens || "Unknown",
          frequency: ebayData?.prodTechInfo?.frequency || "Unknown",
          connectivity: ebayData?.prodTechInfo?.connectivity || "Unknown",
          tax: {
            vatPercentage: ebayData?.prodPricing?.vat || 20,
            applyTax: true,
            thirdPartyTaxCategory: "Electronics",
          },
          format: "FIXED_PRICE",
          // "format": "FormatTypeEnum : [AUCTION,FIXED_PRICE]",
          marketplaceId: "EBAY_US",
          merchantLocationKey: "location1",
          // listingDescription: listingDescriptionData ?? "No description available.",
          listingDescription: listingDescriptionData ?? ebayData.prodTechInfo?.description ?? "No description available.",
          availableQuantity: ebayData.prodPricing?.listingQuantity ?? 10,
          quantityLimitPerBuyer: 5,
          pricingSummary: {
            price: {
              value: retailPrice,
              currency: "USD",
            },

            // "auctionReservePrice": {
            //   "currency": "string",
            //   "value": "string"
            // },
            // "auctionStartPrice": {
            //   "currency": "string",
            //   "value": "string"
            // },
            // "minimumAdvertisedPrice": {
            //   "currency": "string",
            //   "value": "string"
            // },
            // "originallySoldForRetailPriceOn": "SoldOnEnum : [ON_EBAY,OFF_EBAY,ON_AND_OFF_EBAY]",
            // "originalRetailPrice": {
            //   "currency": "string",
            //   "value": "string"
            // },

            // "pricingVisibility": "MinimumAdvertisedPriceHandlingEnum : [NONE,PRE_CHECKOUT,DURING_CHECKOUT]"
          },
          quantity: ebayData.prodPricing?.listingQuantity || 10,
          condition: ebayData.prodPricing?.condition || "NEW",
          shippingOptions: [
            {
              shippingCost: { value: "0.00", currency: "USD" },
              shippingServiceCode: "USPSPriorityMail",
              shipToLocations: [{ countryCode: "US" }],
              packageType: "USPSPriorityMailFlatRateBox",
            },
          ],
          categoryId: categoryId,
          // "secondaryCategoryId": "string",
          listingPolicies: {
            fulfillmentPolicyId: "247696768010" ,
            paymentPolicyId: "247178015010",
            returnPolicyId: "247178019010",
            // bestOfferTerms: {
            //   autoAcceptPrice: {
            //     currency: "string",
            //     value: "string",
            //   },
            //   autoDeclinePrice: {
            //     currency: "string",
            //     value: "string",
            //   },
            //   bestOfferEnabled: "boolean",
            // },
            // eBayPlusIfEligible: "boolean",

            // productCompliancePolicyIds: ["string"],
            // regionalProductCompliancePolicies: {
            //   countryPolicies: [
            //     {
            //       country:
            //         "CountryCodeEnum : [AD,AE,AF,AG,AI,AL,AM,AN,AO,AQ,AR,AS,AT,AU,AW,AX,AZ,BA,BB,BD,BE,BF,BG,BH,BI,BJ,BL,BM,BN,BO,BQ,BR,BS,BT,BV,BW,BY,BZ,CA,CC,CD,CF,CG,CH,CI,CK,CL,CM,CN,CO,CR,CU,CV,CW,CX,CY,CZ,DE,DJ,DK,DM,DO,DZ,EC,EE,EG,EH,ER,ES,ET,FI,FJ,FK,FM,FO,FR,GA,GB,GD,GE,GF,GG,GH,GI,GL,GM,GN,GP,GQ,GR,GS,GT,GU,GW,GY,HK,HM,HN,HR,HT,HU,ID,IE,IL,IM,IN,IO,IQ,IR,IS,IT,JE,JM,JO,JP,KE,KG,KH,KI,KM,KN,KP,KR,KW,KY,KZ,LA,LB,LC,LI,LK,LR,LS,LT,LU,LV,LY,MA,MC,MD,ME,MF,MG,MH,MK,ML,MM,MN,MO,MP,MQ,MR,MS,MT,MU,MV,MW,MX,MY,MZ,NA,NC,NE,NF,NG,NI,NL,NO,NP,NR,NU,NZ,OM,PA,PE,PF,PG,PH,PK,PL,PM,PN,PR,PS,PT,PW,PY,QA,RE,RO,RS,RU,RW,SA,SB,SC,SD,SE,SG,SH,SI,SJ,SK,SL,SM,SN,SO,SR,ST,SV,SX,SY,SZ,TC,TD,TF,TG,TH,TJ,TK,TL,TM,TN,TO,TR,TT,TV,TW,TZ,UA,UG,UM,US,UY,UZ,VA,VC,VE,VG,VI,VN,VU,WF,WS,YE,YT,ZA,ZM,ZW]",
            //       policyIds: ["string"],
            //     },
            //   ],
            // },
            // regionalTakeBackPolicies: {
            //   countryPolicies: [
            //     {
            //       country:
            //         "CountryCodeEnum : [AD,AE,AF,AG,AI,AL,AM,AN,AO,AQ,AR,AS,AT,AU,AW,AX,AZ,BA,BB,BD,BE,BF,BG,BH,BI,BJ,BL,BM,BN,BO,BQ,BR,BS,BT,BV,BW,BY,BZ,CA,CC,CD,CF,CG,CH,CI,CK,CL,CM,CN,CO,CR,CU,CV,CW,CX,CY,CZ,DE,DJ,DK,DM,DO,DZ,EC,EE,EG,EH,ER,ES,ET,FI,FJ,FK,FM,FO,FR,GA,GB,GD,GE,GF,GG,GH,GI,GL,GM,GN,GP,GQ,GR,GS,GT,GU,GW,GY,HK,HM,HN,HR,HT,HU,ID,IE,IL,IM,IN,IO,IQ,IR,IS,IT,JE,JM,JO,JP,KE,KG,KH,KI,KM,KN,KP,KR,KW,KY,KZ,LA,LB,LC,LI,LK,LR,LS,LT,LU,LV,LY,MA,MC,MD,ME,MF,MG,MH,MK,ML,MM,MN,MO,MP,MQ,MR,MS,MT,MU,MV,MW,MX,MY,MZ,NA,NC,NE,NF,NG,NI,NL,NO,NP,NR,NU,NZ,OM,PA,PE,PF,PG,PH,PK,PL,PM,PN,PR,PS,PT,PW,PY,QA,RE,RO,RS,RU,RW,SA,SB,SC,SD,SE,SG,SH,SI,SJ,SK,SL,SM,SN,SO,SR,ST,SV,SX,SY,SZ,TC,TD,TF,TG,TH,TJ,TK,TL,TM,TN,TO,TR,TT,TV,TW,TZ,UA,UG,UM,US,UY,UZ,VA,VC,VE,VG,VI,VN,VU,WF,WS,YE,YT,ZA,ZM,ZW]",
            //       policyIds: ["string"],
            //     },
            //   ],
            // },

            // shippingCostOverrides: [
            //   {
            //     additionalShippingCost: {
            //       currency: "string",
            //       value: "string",
            //     },
            //     priority: "integer",
            //     shippingCost: {
            //       currency: "string",
            //       value: "string",
            //     },
            //     shippingServiceType: "ShippingServiceTypeEnum : [DOMESTIC,INTERNATIONAL]",
            //     surcharge: {
            //       currency: "string",
            //       value: "string",
            //     },
            //   },
            // ],
            // takeBackPolicyId: "string",
          },
          //           "charity": {
          //   "charityId": "string",
          //   "donationPercentage": "string"
          // },

          //remaining from ebayAPI

          // "hideBuyerDetails": "boolean",
          // "includeCatalogProductDetails": "boolean",

          // "listingDuration": "ListingDurationEnum : [DAYS_1,DAYS_3,DAYS_5,DAYS_7,DAYS_10,DAYS_21,DAYS_30,GTC]",

          // "listingStartDate": "string",
          // "lotSize": "integer",

          // "quantityLimitPerBuyer": "integer",
          // "regulatory": {
          //   "documents": [
          //     {
          //       "documentId": "string"
          //     }
          //   ],
          //   "energyEfficiencyLabel": {
          //     "imageDescription": "string",
          //     "imageURL": "string",
          //     "productInformationSheet": "string"
          //   },
          //   "hazmat": {
          //     "component": "string",
          //     "pictograms": [
          //       "string"
          //     ],
          //     "signalWord": "string",
          //     "statements": [
          //       "string"
          //     ]
          //   },
          //   "manufacturer": {
          //     "addressLine1": "string",
          //     "addressLine2": "string",
          //     "city": "string",
          //     "companyName": "string",
          //     "contactUrl": "string",
          //     "country": "CountryCodeEnum : [AD,AE,AF,AG,AI,AL,AM,AN,AO,AQ,AR,AS,AT,AU,AW,AX,AZ,BA,BB,BD,BE,BF,BG,BH,BI,BJ,BL,BM,BN,BO,BQ,BR,BS,BT,BV,BW,BY,BZ,CA,CC,CD,CF,CG,CH,CI,CK,CL,CM,CN,CO,CR,CU,CV,CW,CX,CY,CZ,DE,DJ,DK,DM,DO,DZ,EC,EE,EG,EH,ER,ES,ET,FI,FJ,FK,FM,FO,FR,GA,GB,GD,GE,GF,GG,GH,GI,GL,GM,GN,GP,GQ,GR,GS,GT,GU,GW,GY,HK,HM,HN,HR,HT,HU,ID,IE,IL,IM,IN,IO,IQ,IR,IS,IT,JE,JM,JO,JP,KE,KG,KH,KI,KM,KN,KP,KR,KW,KY,KZ,LA,LB,LC,LI,LK,LR,LS,LT,LU,LV,LY,MA,MC,MD,ME,MF,MG,MH,MK,ML,MM,MN,MO,MP,MQ,MR,MS,MT,MU,MV,MW,MX,MY,MZ,NA,NC,NE,NF,NG,NI,NL,NO,NP,NR,NU,NZ,OM,PA,PE,PF,PG,PH,PK,PL,PM,PN,PR,PS,PT,PW,PY,QA,RE,RO,RS,RU,RW,SA,SB,SC,SD,SE,SG,SH,SI,SJ,SK,SL,SM,SN,SO,SR,ST,SV,SX,SY,SZ,TC,TD,TF,TG,TH,TJ,TK,TL,TM,TN,TO,TR,TT,TV,TW,TZ,UA,UG,UM,US,UY,UZ,VA,VC,VE,VG,VI,VN,VU,WF,WS,YE,YT,ZA,ZM,ZW]",
          //     "email": "string",
          //     "phone": "string",
          //     "postalCode": "string",
          //     "stateOrProvince": "string"
          //   },
          //   "productSafety": {
          //     "component": "string",
          //     "pictograms": [
          //       "string"
          //     ],
          //     "statements": [
          //       "string"
          //     ]
          //   },
          //   "repairScore": "number",
          //   "responsiblePersons": [
          //     {
          //       "addressLine1": "string",
          //       "addressLine2": "string",
          //       "city": "string",
          //       "companyName": "string",
          //       "contactUrl": "string",
          //       "country": "CountryCodeEnum : [AD,AE,AF,AG,AI,AL,AM,AN,AO,AQ,AR,AS,AT,AU,AW,AX,AZ,BA,BB,BD,BE,BF,BG,BH,BI,BJ,BL,BM,BN,BO,BQ,BR,BS,BT,BV,BW,BY,BZ,CA,CC,CD,CF,CG,CH,CI,CK,CL,CM,CN,CO,CR,CU,CV,CW,CX,CY,CZ,DE,DJ,DK,DM,DO,DZ,EC,EE,EG,EH,ER,ES,ET,FI,FJ,FK,FM,FO,FR,GA,GB,GD,GE,GF,GG,GH,GI,GL,GM,GN,GP,GQ,GR,GS,GT,GU,GW,GY,HK,HM,HN,HR,HT,HU,ID,IE,IL,IM,IN,IO,IQ,IR,IS,IT,JE,JM,JO,JP,KE,KG,KH,KI,KM,KN,KP,KR,KW,KY,KZ,LA,LB,LC,LI,LK,LR,LS,LT,LU,LV,LY,MA,MC,MD,ME,MF,MG,MH,MK,ML,MM,MN,MO,MP,MQ,MR,MS,MT,MU,MV,MW,MX,MY,MZ,NA,NC,NE,NF,NG,NI,NL,NO,NP,NR,NU,NZ,OM,PA,PE,PF,PG,PH,PK,PL,PM,PN,PR,PS,PT,PW,PY,QA,RE,RO,RS,RU,RW,SA,SB,SC,SD,SE,SG,SH,SI,SJ,SK,SL,SM,SN,SO,SR,ST,SV,SX,SY,SZ,TC,TD,TF,TG,TH,TJ,TK,TL,TM,TN,TO,TR,TT,TV,TW,TZ,UA,UG,UM,US,UY,UZ,VA,VC,VE,VG,VI,VN,VU,WF,WS,YE,YT,ZA,ZM,ZW]",
          //       "email": "string",
          //       "phone": "string",
          //       "postalCode": "string",
          //       "stateOrProvince": "string",
          //       "types": [
          //         "ResponsiblePersonTypeEnum"
          //       ]
          //     }
          //   ]
          // },

          // "storeCategoryNames": [
          //   "string"
          // ],

          // "extendedProducerResponsibility": {
          //   "ecoParticipationFee": {
          //     "currency": "string",
          //     "value": "string"
          //   },
          //   "producerProductId": "string",
          //   "productDocumentationId": "string",
          //   "productPackageId": "string",
          //   "shipmentPackageId": "string"
          // },
        };
        // console.log("Listing Description Data:",listingDescriptionData);
        // console.log("Request Body for Offer Creation:", JSON.stringify(offerBody, null, 2));

        const offerResponse = await fetch(`${baseURL}/sell/inventory/v1/offer`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            "Content-Language": "en-US",
            "Accept-Language": "en-US",
          },
          body: JSON.stringify(offerBody),
        });

        const offerResponseText = await offerResponse.text();
        console.log("Response Text from Offer Creation:", offerResponseText);

        if (!offerResponseText) {
          // If empty response is received, return success status
          return JSON.stringify({
            status: 201,
            statusText: "Created",
            message: "Offer created successfully on eBay",
          });
        }

        console.log("Offer Created Successfully:", offerResponseText);
      }

      return JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        message: "Item created and offer created successfully on eBay",
      });
    } catch (error: any) {
      console.error("Error syncing product with eBay:", error.message);

      return JSON.stringify({
        status: 500,
        message: error.message || "Error syncing with eBay API",
      });
    }
  },

  // Helper function to map eBay error codes to human-readable messages
  getEbayErrorMessage(errors: any[]): string {
    if (!errors || errors.length === 0) {
      return "Unknown error from eBay";
    }

    const error = errors[0]; // Assuming we are dealing with a single error for simplicity
    switch (error.code) {
      case "25001":
        return `System error occurred: ${error.message}`;
      case "25002":
        return `User error occurred: ${error.message}`;
      case "25003":
        return `Invalid price: ${error.message}`;
      case "25004":
        return `Invalid quantity: ${error.message}`;
      case "25005":
        return `Invalid category ID: ${error.message}`;
      case "25006":
        return `Invalid listing option: ${error.message}`;
      case "25007":
        return `Invalid Fulfillment policy: ${error.message}`;
      case "25008":
        return `Invalid Payment policy: ${error.message}`;
      case "25009":
        return `Invalid Return policy: ${error.message}`;
      case "25014":
        return `Invalid pictures: ${error.message}`;
      case "25019":
        return `Cannot revise listing: ${error.message}`;
      case "25710":
        return `Resource not found: ${error.message}`;
      default:
        return `eBay error occurred: ${error.message || "Unknown error"}`;
    }
  },

  getCategoryAspects(categoryName: string, prodTechInfo: any) {
    switch (categoryName) {
      case "PC Laptops & Netbooks":
        return {
          Brand: [prodTechInfo?.brand || "Unbranded"],
          Processor: [prodTechInfo?.processor || "Unknown"],
          RAM: [prodTechInfo?.ramSize || "Unknown"],
          Storage: [prodTechInfo?.storageType || "Unknown"],
        };
      case "PC Desktops & All-In-Ones":
        return {
          Brand: [prodTechInfo?.brand || "Unbranded"],
          FormFactor: [prodTechInfo?.formFactor || "Unknown"],
          GPU: [prodTechInfo?.gpu || "Unknown"],
          RAM: [prodTechInfo?.ramSize || "Unknown"],
          Storage: [prodTechInfo?.storageType || "Unknown"],
        };
      case "Monitors":
        return {
          Brand: [prodTechInfo?.brand || "Unbranded"],
          ScreenSize: [prodTechInfo?.screenSize || "Unknown"],
          Resolution: [prodTechInfo?.resolution || "Unknown"],
        };
      case "Projectors":
        return {
          Brand: [prodTechInfo?.brand || "Unbranded"],
          Lumens: [prodTechInfo?.lumens || "Unknown"],
          Resolution: [prodTechInfo?.resolution || "Unknown"],
        };
      case "Neetwork Equipments":
        return {
          Brand: [prodTechInfo?.brand || "Unbranded"],
          Frequency: [prodTechInfo?.frequency || "Unknown"],
          Connectivity: [prodTechInfo?.connectivity || "Unknown"],
        };
      default:
        return {
          Brand: [prodTechInfo?.brand || "Unbranded"],
        };
    }
  },
};
