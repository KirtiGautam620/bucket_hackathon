import { insertLead } from './leadService';
import { enableDemoMode, disableDemoMode, toggleDemoNetwork } from './networkService';

const DEMO_LEADS = [
    {
        name: 'Rajesh Kumar',
        phone: '+919876543210',
        email: 'rajesh.kumar@techcorp.in',
        company: 'Tech Corp India Pvt Ltd',
    },
    {
        name: 'Priya Sharma',
        phone: '+919876543211',
        email: 'priya.sharma@innovate.com',
        company: 'Innovate Solutions',
    },
    {
        name: 'Amit Patel',
        phone: '+919876543212',
        email: 'amit.patel@digitalwave.io',
        company: 'Digital Wave Technologies',
    },
    {
        name: 'Sneha Reddy',
        phone: '+919876543213',
        email: 'sneha.reddy@cloudnine.in',
        company: 'CloudNine Systems',
    },
    {
        name: 'Vikram Singh',
        phone: '+919876543214',
        email: 'vikram.singh@nexustech.com',
        company: 'Nexus Technologies',
    },
    {
        name: 'Anita Desai',
        phone: '+919876543215',
        email: 'anita.desai@smartsolutions.net',
        company: 'Smart Solutions Ltd',
    },
    {
        name: 'Karthik Krishnan',
        phone: '+919876543216',
        email: 'karthik@futurelabs.io',
        company: 'Future Labs',
    },
    {
        name: 'Meera Iyer',
        phone: '+919876543217',
        email: 'meera.iyer@dataworks.com',
        company: 'DataWorks India',
    },
    {
        name: 'Rohan Malhotra',
        phone: '+919876543218',
        email: 'rohan@techventures.in',
        company: 'Tech Ventures Pvt Ltd',
    },
    {
        name: 'Divya Nair',
        phone: '+919876543219',
        email: 'divya.nair@quantumsoft.com',
        company: 'Quantum Software Solutions',
    },
    {
        name: 'Arjun Mehta',
        phone: '+919876543220',
        email: 'arjun.mehta@netcore.in',
        company: 'NetCore Systems',
    },
    {
        name: 'Kavya Rao',
        phone: '+919876543221',
        email: 'kavya.rao@codecraft.io',
        company: 'CodeCraft Technologies',
    },
    {
        name: 'Sanjay Gupta',
        phone: '+919876543222',
        email: 'sanjay.gupta@biztech.com',
        company: 'BizTech Solutions',
    },
    {
        name: 'Neha Joshi',
        phone: '+919876543223',
        email: 'neha.joshi@webwizards.in',
        company: 'Web Wizards India',
    },
    {
        name: 'Arun Kumar',
        phone: '+919876543224',
        email: 'arun.kumar@appforge.io',
        company: 'AppForge Technologies',
    },
];

/**
 * Seed demo leads into the database
 */
export const seedDemoLeads = async (count: number = 15): Promise<number> => {
    try {
        let inserted = 0;
        const leadsToInsert = DEMO_LEADS.slice(0, Math.min(count, DEMO_LEADS.length));

        for (const leadData of leadsToInsert) {
            const lead = await insertLead(leadData);
            if (lead) {
                inserted++;
            }
        }

        console.log(`Demo data: ${inserted} leads inserted`);
        return inserted;
    } catch (error) {
        console.error('Error seeding demo leads:', error);
        return 0;
    }
};

/**
 * Enable demo mode (simulated offline/online)
 */
export const startDemoMode = (online: boolean = true): void => {
    enableDemoMode(online);
};

/**
 * Disable demo mode (use real network state)
 */
export const stopDemoMode = (): void => {
    disableDemoMode();
};

/**
 * Toggle demo network state
 */
export const toggleDemoNetworkState = (): void => {
    toggleDemoNetwork();
};

/**
 * Get random lead data for testing
 */
export const getRandomLeadData = () => {
    const randomLead = DEMO_LEADS[Math.floor(Math.random() * DEMO_LEADS.length)];
    return {
        ...randomLead,
        // Add random suffix to avoid duplicates
        phone: randomLead.phone.slice(0, -4) + Math.floor(1000 + Math.random() * 9000),
    };
};

/**
 * Simulate mock backend response
 */
export const mockBackendResponse = (success: boolean = true) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (success) {
                resolve({ status: 'ok', message: 'Lead created successfully' });
            } else {
                reject(new Error('Mock backend error'));
            }
        }, 500);
    });
};
