export const BANNER_TEMPLATES = [
  {
    id: 'template-1',
    label: 'Template 1',
    preview: {
      background: '#F4F7FB',
      accent: '#E3E8F4',
      title: '#0F172A',
      subtitle: '#475569',
      cta: '#0F766E',
    },
  },
  {
    id: 'template-2',
    label: 'Template 2',
    preview: {
      background: '#FBF5FF',
      accent: '#E9D5FF',
      title: '#581C87',
      subtitle: '#7E22CE',
      cta: '#A855F7',
    },
  },
  {
    id: 'template-3',
    label: 'Template 3',
    preview: {
      background: '#FFF3EA',
      accent: '#FED7AA',
      title: '#7C2D12',
      subtitle: '#9A3412',
      cta: '#F97316',
    },
  },
  {
    id: 'template-4',
    label: 'Template 4',
    preview: {
      background: '#F1FFF4',
      accent: '#BBF7D0',
      title: '#14532D',
      subtitle: '#166534',
      cta: '#10B981',
    },
  },
  {
    id: 'template-5',
    label: 'Template 5',
    preview: {
      background: '#FDF2F8',
      accent: '#FBCFE8',
      title: '#831843',
      subtitle: '#9D174D',
      cta: '#DB2777',
    },
  },
];

export const getTemplateById = (id) =>
  BANNER_TEMPLATES.find((template) => template.id === id) || BANNER_TEMPLATES[0];



