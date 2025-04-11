import { Router } from "express"
import { faqsPolicyController } from "@/controllers"
import { faqsValidation } from "@/validations";

export const faqsPolicy = (router: Router) => {

    router.post('/', faqsValidation.addFaqs, faqsPolicyController.createFaqsPolicy);

    router.get('/',  faqsPolicyController.getAllFaqsPolicy);

    router.delete('/:id', faqsValidation.validateId, faqsPolicyController.deleteFaqs);

    router.patch('/:id',  faqsValidation.editFaqs, faqsPolicyController.editFaqs)

}