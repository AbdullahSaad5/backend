import HeroSliderModel from "@/models/hero-slider.model";
import { IHeroSlider } from "@/contracts/hero-slider.contract";

export const heroSliderService = {
  // Create a new slide
  createSlide: async (data: Partial<IHeroSlider>): Promise<IHeroSlider> => {
    const slide = await HeroSliderModel.create(data);
    return slide;
  },

  // Get all slides
  getSlides: async (): Promise<IHeroSlider[]> => {
    return HeroSliderModel.find().sort({ createdAt: -1 }).exec();
  },

  // Update a slide
  updateSlide: async (id: string, data: Partial<IHeroSlider>): Promise<IHeroSlider | null> => {
    return HeroSliderModel.findByIdAndUpdate(id, data, { new: true });
  },

  // Delete a slide
  deleteSlide: async (id: string): Promise<boolean> => {
    const result = await HeroSliderModel.findByIdAndDelete(id);
    return !!result;
  },
};
