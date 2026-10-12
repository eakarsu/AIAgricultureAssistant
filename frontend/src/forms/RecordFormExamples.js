export const recordFormExamples = {
  "CropDisease": [
    {
      "name": "Leaf review",
      "fields": {
        "crop_name": "Tomato",
        "symptoms": "Fictional example: yellow spots on lower leaves; the cause has not been verified.",
        "severity": "moderate",
        "location": "Fictional demo plot A",
        "detected_date": "2026-10-01"
      }
    },
    {
      "name": "Early signs",
      "fields": {
        "crop_name": "Wheat",
        "symptoms": "Fictional example: a few pale leaf patches for a qualified agronomist to inspect.",
        "severity": "mild",
        "location": "Fictional demo plot B",
        "detected_date": "2026-10-02"
      }
    },
    {
      "name": "Urgent inspection",
      "fields": {
        "crop_name": "Maize",
        "symptoms": "Fictional example: extensive wilting and leaf damage; no diagnosis or treatment approval is supplied.",
        "severity": "severe",
        "location": "Fictional demo plot C",
        "detected_date": "2026-10-03"
      }
    }
  ],
  "Irrigation": [
    {
      "name": "Weekly planning",
      "fields": {
        "field_name": "Fictional demo North",
        "crop_type": "Corn",
        "field_size": "45",
        "soil_type": "Clay Loam",
        "current_moisture": "28",
        "target_moisture": "65",
        "weather_condition": "Sunny",
        "temperature": "88",
        "humidity": "42"
      }
    },
    {
      "name": "Wet weather",
      "fields": {
        "field_name": "Fictional demo East",
        "crop_type": "Beans",
        "field_size": "12",
        "soil_type": "Loam",
        "current_moisture": "60",
        "target_moisture": "60",
        "weather_condition": "Rainy",
        "temperature": "62",
        "humidity": "80"
      }
    },
    {
      "name": "Zero-area boundary",
      "fields": {
        "field_name": "Fictional demo boundary",
        "crop_type": "Wheat",
        "field_size": "0",
        "soil_type": "Sandy Loam",
        "current_moisture": "0",
        "target_moisture": "40",
        "weather_condition": "Cloudy",
        "temperature": "0",
        "humidity": "0"
      }
    }
  ],
  "Harvest": [
    {
      "name": "Readiness review",
      "fields": {
        "field_name": "Fictional demo East Valley",
        "crop_type": "Wheat",
        "field_size": "120",
        "planting_date": "2026-03-15",
        "current_growth_stage": "Flowering",
        "health_status": "good",
        "weather_outlook": "Fictional planning assumption: warm and dry; no actual forecast has been supplied."
      }
    },
    {
      "name": "Small plot",
      "fields": {
        "field_name": "Fictional demo Orchard",
        "crop_type": "Beans",
        "field_size": "5",
        "planting_date": "2026-07-01",
        "current_growth_stage": "Pod development",
        "health_status": "fair",
        "weather_outlook": "Fictional planning assumption: unsettled weather; verify an authorized forecast before acting."
      }
    },
    {
      "name": "Boundary planning",
      "fields": {
        "field_name": "Fictional demo boundary",
        "crop_type": "Maize",
        "field_size": "0",
        "planting_date": "2026-09-01",
        "current_growth_stage": "Planning only",
        "health_status": "poor",
        "weather_outlook": "Fictional example with zero planted area; no harvest authorization or verified crop observation."
      }
    }
  ],
  "Pest": [
    {
      "name": "Leaf inspection",
      "fields": {
        "affected_crop": "Soybean",
        "symptoms": "Fictional example: small holes in leaves; no pest identity has been verified.",
        "location": "Fictional demo South",
        "severity": "moderate"
      }
    },
    {
      "name": "Early signs",
      "fields": {
        "affected_crop": "Tomato",
        "symptoms": "Fictional example: isolated leaf-edge damage; ask for actual field observations.",
        "location": "Fictional demo Greenhouse",
        "severity": "mild"
      }
    },
    {
      "name": "Urgent review",
      "fields": {
        "affected_crop": "Corn",
        "symptoms": "Fictional example: widespread plant damage for qualified review; no chemical application is approved.",
        "location": "Fictional demo West",
        "severity": "severe"
      }
    }
  ],
  "Soil": [
    {
      "name": "Balanced planning",
      "fields": {
        "field_name": "Fictional demo West Ridge",
        "sample_location": "Fictional center sample",
        "ph_level": "6.2",
        "nitrogen_level": "35",
        "phosphorus_level": "22",
        "potassium_level": "180",
        "organic_matter": "3.8",
        "soil_texture": "Loam",
        "moisture_content": "31"
      }
    },
    {
      "name": "Sandy planning",
      "fields": {
        "field_name": "Fictional demo Sandy Plot",
        "sample_location": "Fictional edge sample",
        "ph_level": "5.4",
        "nitrogen_level": "15",
        "phosphorus_level": "12",
        "potassium_level": "95",
        "organic_matter": "1.8",
        "soil_texture": "Sandy",
        "moisture_content": "18"
      }
    },
    {
      "name": "Zero-value boundary",
      "fields": {
        "field_name": "Fictional demo boundary",
        "sample_location": "Fictional boundary sample",
        "ph_level": "7.0",
        "nitrogen_level": "0",
        "phosphorus_level": "0",
        "potassium_level": "0",
        "organic_matter": "0",
        "soil_texture": "Clay",
        "moisture_content": "0"
      }
    }
  ]
};
