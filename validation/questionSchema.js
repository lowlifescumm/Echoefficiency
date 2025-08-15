const Joi = require('joi');

const optionSchema = Joi.object({
    text: Joi.string().required(),
    pinned: Joi.boolean().required(),
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
    shuffle: Joi.boolean().required(),
    options: Joi.array().items(optionSchema).min(1).required(),
});

const multipleChoiceQuestionSchema = Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid('multiple-choice').required(),
    label: Joi.string().required(),
    helpText: Joi.string().allow(''),
    required: Joi.boolean().required(),
    shuffle: Joi.boolean().required(),
    options: Joi.array().items(optionSchema).min(1).required(),
});

const numberQuestionSchema = Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid('number').required(),
    label: Joi.string().required(),
    helpText: Joi.string().allow(''),
    required: Joi.boolean().required(),
    min: Joi.number().allow(null),
    max: Joi.number().allow(null),
    step: Joi.number().allow(null),
});

const emailQuestionSchema = Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid('email').required(),
    label: Joi.string().required(),
    helpText: Joi.string().allow(''),
    required: Joi.boolean().required(),
});

const dateQuestionSchema = Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid('date').required(),
    label: Joi.string().required(),
    helpText: Joi.string().allow(''),
    required: Joi.boolean().required(),
});

const blockSchema = Joi.alternatives().try(
    shortTextQuestionSchema,
    singleChoiceQuestionSchema,
    multipleChoiceQuestionSchema,
    numberQuestionSchema,
    emailQuestionSchema,
    dateQuestionSchema
);

module.exports = {
    blockSchema,
};
