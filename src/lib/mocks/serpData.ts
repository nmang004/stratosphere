/**
 * Mock SERP Data for SERP Shapeshifter
 *
 * Provides realistic SERP results for demo purposes.
 * Real integration with Serper.dev will come in a future phase.
 */

export interface SERPResult {
  position: number
  domain: string
  title: string
  description: string
  url: string
}

export interface SERPAnalysis {
  keyword: string
  clientResult: SERPResult | null
  competitors: SERPResult[]
  aiSuggestions?: {
    titleSuggestions: string[]
    descriptionSuggestions: string[]
    psychologicalTriggers: string[]
  }
}

// Mock client domains (would be dynamically determined in production)
const CLIENT_DOMAINS = [
  'techflowsolutions.com',
  'greenleaforganics.com',
  'swiftlogistics.io',
  'brightmindacademy.edu',
  'urbanstyleco.com',
]

// Mock SERP data for various keywords
export const mockSERPResults: Record<string, SERPAnalysis> = {
  'seo services': {
    keyword: 'seo services',
    clientResult: {
      position: 4,
      domain: 'techflowsolutions.com',
      title: 'Professional SEO Services | TechFlow Solutions',
      description: 'Boost your rankings with our expert SEO services. Data-driven strategies for sustainable organic growth.',
      url: 'https://techflowsolutions.com/services/seo',
    },
    competitors: [
      {
        position: 1,
        domain: 'semrush.com',
        title: 'SEO Services That Deliver Results | #1 Rated Agency',
        description: 'Get more traffic with our proven SEO strategies. Free site audit. 14-day trial. Trusted by 10M+ marketers worldwide.',
        url: 'https://semrush.com/agency/seo-services',
      },
      {
        position: 2,
        domain: 'ahrefs.com',
        title: 'Enterprise SEO Services - Drive 10X Organic Traffic',
        description: 'Award-winning SEO agency. ROI-focused strategies. See our case studies with 500%+ traffic growth. Free consultation.',
        url: 'https://ahrefs.com/seo-services',
      },
      {
        position: 3,
        domain: 'moz.com',
        title: 'Professional SEO Services | Trusted Since 2004',
        description: 'Industry-leading SEO expertise. Transparent reporting. Dedicated account managers. Start with a free analysis today.',
        url: 'https://moz.com/services',
      },
    ],
  },
  'organic produce delivery': {
    keyword: 'organic produce delivery',
    clientResult: {
      position: 6,
      domain: 'greenleaforganics.com',
      title: 'Organic Produce Delivery - Fresh to Your Door',
      description: 'Farm-fresh organic fruits and vegetables delivered weekly. Supporting local farmers since 2015.',
      url: 'https://greenleaforganics.com/delivery',
    },
    competitors: [
      {
        position: 1,
        domain: 'misfitsmarket.com',
        title: 'Organic Produce Delivery | Up to 40% Off Retail - Misfits Market',
        description: 'Save money on organic groceries. Rescue perfectly good produce. Free delivery on orders $30+. Join 500K+ happy customers.',
        url: 'https://misfitsmarket.com',
      },
      {
        position: 2,
        domain: 'imperfectfoods.com',
        title: 'Fresh Organic Produce Delivered Weekly | Imperfect Foods',
        description: 'Customize your box. Skip anytime. 30% average savings. Fighting food waste one delivery at a time.',
        url: 'https://imperfectfoods.com/organic',
      },
      {
        position: 3,
        domain: 'farmboxdirect.com',
        title: 'Organic Farm Box Delivery | 100% Certified Organic',
        description: 'Certified organic produce delivered fresh. Family-owned farms. No pesticides. No GMOs. First box 25% off.',
        url: 'https://farmboxdirect.com',
      },
    ],
  },
  'logistics software': {
    keyword: 'logistics software',
    clientResult: {
      position: 8,
      domain: 'swiftlogistics.io',
      title: 'Logistics Software Solutions | Swift Logistics',
      description: 'Streamline your supply chain with our comprehensive logistics platform. Real-time tracking and analytics.',
      url: 'https://swiftlogistics.io/platform',
    },
    competitors: [
      {
        position: 1,
        domain: 'sap.com',
        title: 'Logistics Software | End-to-End Supply Chain - SAP',
        description: 'Transform your logistics with AI-powered optimization. Real-time visibility. Reduce costs by 30%. Request a demo.',
        url: 'https://sap.com/logistics',
      },
      {
        position: 2,
        domain: 'oracle.com',
        title: 'Logistics Management Software | Oracle Cloud',
        description: 'Complete logistics suite. Warehouse, transport, fleet management. Trusted by Fortune 500. See pricing.',
        url: 'https://oracle.com/logistics-cloud',
      },
      {
        position: 3,
        domain: 'shipbob.com',
        title: 'Best Logistics Software 2024 | ShipBob Fulfillment',
        description: '2-day shipping anywhere in the US. Easy integrations. Transparent pricing. Start with a free analysis.',
        url: 'https://shipbob.com/logistics-software',
      },
    ],
  },
  'online learning platform': {
    keyword: 'online learning platform',
    clientResult: {
      position: 12,
      domain: 'brightmindacademy.edu',
      title: 'Online Learning - Bright Mind Academy',
      description: 'Quality online education for all ages. Certified instructors. Flexible scheduling.',
      url: 'https://brightmindacademy.edu/online',
    },
    competitors: [
      {
        position: 1,
        domain: 'coursera.org',
        title: 'Online Learning Platform | 7000+ Courses - Coursera',
        description: 'Learn from top universities. Earn certificates. Flexible schedules. Join 100M+ learners. Start free today.',
        url: 'https://coursera.org',
      },
      {
        position: 2,
        domain: 'udemy.com',
        title: 'Online Courses - Learn Anything | Udemy',
        description: '200,000+ courses. Expert instructors. Lifetime access. 30-day money-back guarantee. Courses from $9.99.',
        url: 'https://udemy.com',
      },
      {
        position: 3,
        domain: 'skillshare.com',
        title: 'Online Classes for Creative Professionals | Skillshare',
        description: 'Explore thousands of classes in design, business, tech and more. Start your free trial. No commitments.',
        url: 'https://skillshare.com',
      },
    ],
  },
  'sustainable fashion': {
    keyword: 'sustainable fashion',
    clientResult: {
      position: 5,
      domain: 'urbanstyleco.com',
      title: 'Sustainable Fashion | Urban Style Co.',
      description: 'Eco-friendly clothing that looks good. Ethically sourced materials. Free shipping on orders over $75.',
      url: 'https://urbanstyleco.com/sustainable',
    },
    competitors: [
      {
        position: 1,
        domain: 'everlane.com',
        title: 'Sustainable Fashion - Transparent Pricing | Everlane',
        description: 'Know your factories. Know your costs. Ethical fashion made simple. Shop consciously. Free returns.',
        url: 'https://everlane.com',
      },
      {
        position: 2,
        domain: 'reformation.com',
        title: 'Sustainable Women\'s Clothing | Reformation',
        description: 'Climate positive fashion. Track our environmental impact. Cute clothes that don\'t cost the earth. Shop now.',
        url: 'https://reformation.com',
      },
      {
        position: 3,
        domain: 'patagonia.com',
        title: 'Sustainable Outdoor Clothing | Patagonia',
        description: 'We\'re in business to save our home planet. Repair, reuse, recycle. 1% for the Planet. Shop responsibly.',
        url: 'https://patagonia.com/sustainable',
      },
    ],
  },
}

// Default fallback for unknown keywords
export const defaultSERPResult: SERPAnalysis = {
  keyword: '',
  clientResult: null,
  competitors: [
    {
      position: 1,
      domain: 'competitor1.com',
      title: '[Keyword] Services - Industry Leader',
      description: 'Top-rated [keyword] solutions. Trusted by thousands. Free consultation. See why we\'re #1.',
      url: 'https://competitor1.com',
    },
    {
      position: 2,
      domain: 'competitor2.com',
      title: 'Best [Keyword] Solutions 2024 | Expert Reviews',
      description: 'Compare top providers. Unbiased reviews. Find the perfect solution for your needs. Start free.',
      url: 'https://competitor2.com',
    },
    {
      position: 3,
      domain: 'competitor3.com',
      title: '[Keyword] Made Easy | Get Started Today',
      description: 'Simple, affordable [keyword] services. No contracts. Cancel anytime. Join 50K+ satisfied customers.',
      url: 'https://competitor3.com',
    },
  ],
}

/**
 * Gets mock SERP results for a keyword
 */
export function getMockSERPResults(
  keyword: string,
  clientDomain?: string
): SERPAnalysis {
  // Normalize keyword
  const normalizedKeyword = keyword.toLowerCase().trim()

  // Check if we have mock data for this keyword
  const mockResult = mockSERPResults[normalizedKeyword]

  if (mockResult) {
    // If client domain provided, check if it matches
    if (clientDomain && mockResult.clientResult?.domain !== clientDomain) {
      // Return a modified result showing client not ranking
      return {
        ...mockResult,
        clientResult: {
          position: 15 + Math.floor(Math.random() * 10), // Random position 15-24
          domain: clientDomain,
          title: `${keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} | ${clientDomain.replace('.com', '').replace('.io', '').split('.')[0]}`,
          description: `Learn about our ${keyword.toLowerCase()} offerings. Professional service and dedicated support.`,
          url: `https://${clientDomain}/${keyword.toLowerCase().replace(/\s+/g, '-')}`,
        },
      }
    }
    return mockResult
  }

  // Generate a default result for unknown keywords
  return {
    keyword: normalizedKeyword,
    clientResult: clientDomain
      ? {
          position: 10 + Math.floor(Math.random() * 15),
          domain: clientDomain,
          title: `${keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} | Your Company`,
          description: `Professional ${keyword.toLowerCase()} services. Contact us for more information.`,
          url: `https://${clientDomain}/${keyword.toLowerCase().replace(/\s+/g, '-')}`,
        }
      : null,
    competitors: defaultSERPResult.competitors.map((c, i) => ({
      ...c,
      title: c.title.replace(/\[Keyword\]/g, keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')),
      description: c.description.replace(/\[keyword\]/g, keyword.toLowerCase()),
    })),
  }
}

/**
 * Mock psychological trigger suggestions
 */
export const psychologicalTriggers = {
  urgency: [
    'Limited time offer',
    'Only X spots left',
    'Ends soon',
    'Don\'t miss out',
    'Act now',
  ],
  social_proof: [
    'Trusted by X+ customers',
    'Join X+ happy users',
    '#1 rated',
    'Award-winning',
    'As seen in',
  ],
  authority: [
    'Industry experts',
    'Certified professionals',
    'Since [year]',
    'Trusted partner',
    'Official provider',
  ],
  reciprocity: [
    'Free trial',
    'Free consultation',
    'Free guide',
    'No obligation',
    'Complimentary audit',
  ],
  scarcity: [
    'Exclusive access',
    'Members only',
    'Premium service',
    'Select clients',
    'By invitation',
  ],
  risk_reversal: [
    'Money-back guarantee',
    'No risk',
    'Cancel anytime',
    'Free returns',
    'Satisfaction guaranteed',
  ],
}
