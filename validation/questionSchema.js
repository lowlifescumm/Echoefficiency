const Joi = require('joi');

const optionSchema = Joi.object({
    text: Joi.string().required(),
});

const shortTextQuestionSchema = Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid('short-text').required(),
    label: Joi.string().required(),
    helpText: Joi.string().allow(''),
    required: Joi.boolean().required(),
});

const singleChoiceQuestionSchema = Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid('single-choice').required(),
    label: Joi.string().required(),
    helpText: Joi.string().allow(''),
    required: Joi.boolean().required(),
    options: Joi.array().items(optionSchema).min(1).required(),
});

const multipleChoiceQuestionSchema = Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid('multiple-choice').required(),
    label: Joi.string().required(),
    helpText: Joi.string().allow(''),
    required: Joi.boolean().required(),
    options: Joi.array().items(optionSchema).min(1).required(),
});

const blockSchema = Joi.alternatives().try(
    shortTextQuestionSchema,
    singleChoiceQuestionSchema,
    multipleChoiceQuestionSchema
);

module.exports = {
    blockSchema,
};
