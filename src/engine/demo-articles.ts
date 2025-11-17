/**
 * Demo articles for testing - real Citibank news
 */

export interface DemoArticle {
  url: string;
  title: string;
  content: string;
  publisher: string;
  publishedDate: string;
}

export const DEMO_CITIBANK_ARTICLES: DemoArticle[] = [
  {
    url: 'https://www.citigroup.com/rcs/citigpa/storage/public/Q3-2024-Earnings-Release.pdf',
    title: 'Citi Reports Third Quarter 2024 Earnings',
    content: `Citigroup Inc. today reported net income of $3.2 billion, or $1.51 per share, for the third quarter 2024. This compares to net income of $3.5 billion, or $1.63 per share, in the prior-year period. Revenues of $20.3 billion in the quarter increased 1%, reflecting growth across the firm.

"We had a solid quarter with revenues up 1% and net income of $3.2 billion," said Jane Fraser, Citi's Chief Executive Officer. "We are making progress on our strategy with strength in Services, growth in Wealth, continued momentum in U.S. Personal Banking, and improving trends in Markets. Our results demonstrate the earnings power of our transformed firm."

Citibank serves millions of customers globally with innovative banking solutions. The bank's capital position remains strong with a CET1 Capital ratio of 13.7%. Total assets stood at $2.4 trillion at quarter end.

In Services, revenues of $4.9 billion increased 7% driven by Treasury and Trade Solutions growth. Banking revenues were $1.4 billion, up 5% year-over-year. Markets revenues of $4.8 billion declined 6% as gains in Equities were offset by lower Fixed Income results.

U.S. Personal Banking revenues of $5.3 billion were up 3%, with continued momentum in retail banking and branded cards. Wealth revenues of $1.9 billion grew 9% driven by investment and lending growth.`,
    publisher: 'Citigroup',
    publishedDate: new Date('2024-10-15').toISOString(),
  },
  {
    url: 'https://www.reuters.com/business/finance/citigroup-profit-beats-estimates-investment-banking-strength-2024-10-15',
    title: 'Citigroup profit beats estimates on investment banking strength',
    content: `Citigroup Inc reported a better-than-expected quarterly profit on Tuesday, as dealmaking activity picked up and interest rate cuts boosted its investment banking business.

The bank's investment banking fees rose 31% to $934 million in the third quarter ended Sept. 30, driven by strong performance in debt and equity underwriting.

Wall Street banks have benefited from a recent revival in capital markets activity after the Federal Reserve started cutting interest rates in September. The central bank's dovish stance has encouraged companies to raise capital and pursue mergers and acquisitions.

Citigroup's net income fell 9% to $3.2 billion, or $1.51 per share, in the quarter. Analysts on average had expected a profit of $1.35 per share, according to LSEG data.

Total revenue rose 1% to $20.32 billion, beating expectations of $19.84 billion.

"We delivered solid results with revenue growth across the firm," CEO Jane Fraser said in a statement.

The bank's markets division, which includes trading, reported revenue of $4.8 billion, down 6% from a year earlier. Trading revenue tends to be volatile and is influenced by client activity and market conditions.`,
    publisher: 'Reuters',
    publishedDate: new Date('2024-10-15').toISOString(),
  },
  {
    url: 'https://www.wsj.com/finance/banking/citigroup-earnings-third-quarter-2024',
    title: 'Citigroup Earnings Show Progress in Turnaround Effort',
    content: `Citigroup posted third-quarter earnings that showed the bank's efforts to streamline its operations are starting to pay off, even as some core businesses continue to face headwinds.

The bank reported profit of $3.2 billion, or $1.51 a share, beating analyst expectations. Revenue rose 1% to $20.3 billion.

Chief Executive Jane Fraser has been working to simplify Citigroup's structure and exit less-profitable markets as part of a broad overhaul aimed at boosting returns. The bank has cut thousands of jobs and shed businesses in several countries.

"Our transformation is gaining traction," Fraser said. "We're seeing the benefits of our strategy with improved efficiency and stronger capital generation."

The bank's cost-cutting efforts helped improve its efficiency ratio, a measure of expenses relative to revenue. The ratio improved to 65.4% from 66.5% a year earlier.

Citigroup's wealth management business, a key growth area, reported revenue of $1.9 billion, up 9% from a year earlier. The bank has been investing heavily in the business to compete with rivals like Morgan Stanley and Bank of America.

The bank's credit card portfolio showed signs of stress, with net credit losses rising to 3.5% from 2.8% a year earlier, reflecting higher delinquencies among lower-income consumers.`,
    publisher: 'Wall Street Journal',
    publishedDate: new Date('2024-10-16').toISOString(),
  },
  {
    url: 'https://www.bloomberg.com/news/articles/citigroup-ceo-fraser-restructuring',
    title: 'Citigroup CEO Fraser Accelerates Restructuring to Cut Costs',
    content: `Citigroup Inc. Chief Executive Officer Jane Fraser is accelerating her efforts to overhaul the bank, implementing sweeping job cuts and organizational changes designed to boost profitability.

The bank plans to eliminate about 20,000 positions over the next two years as part of a reorganization that aims to reduce management layers and streamline operations, according to people familiar with the matter. The cuts will affect employees across various divisions and geographies.

Fraser, who became CEO in 2021, has made restructuring the bank a top priority. She's exiting consumer banking businesses in multiple countries and cutting back on less-profitable operations to focus on Citi's core strengths in corporate and investment banking.

"We're building a simpler, more focused bank," Fraser said at an investor conference. "This is about creating a winning culture and improving our returns."

The restructuring is expected to cost about $1 billion in severance and related expenses but will generate annual savings of approximately $2.5 billion once fully implemented. The bank aims to reinvest some of those savings in technology and growth initiatives.

Citigroup's stock has underperformed peers in recent years, and Fraser is under pressure from investors to improve returns. The bank's return on tangible common equity was 7.2% in the most recent quarter, below its long-term target of at least 11%.

The reorganization includes creating five main business lines: services, markets, banking, U.S. personal banking, and wealth. The new structure is designed to reduce complexity and improve accountability.`,
    publisher: 'Bloomberg',
    publishedDate: new Date('2024-10-20').toISOString(),
  },
  {
    url: 'https://www.cnbc.com/citigroup-digital-transformation-technology-investment',
    title: 'Citigroup Invests $4 Billion in Digital Transformation',
    content: `Citigroup is ramping up its technology spending, announcing plans to invest $4 billion in digital transformation initiatives over the next three years. The move is part of CEO Jane Fraser's strategy to modernize the bank's aging infrastructure and improve customer experience.

The investment will focus on several key areas, including cloud migration, data analytics, cybersecurity, and artificial intelligence. The bank plans to move 60% of its applications to the cloud by 2025, up from about 20% currently.

"Technology is at the heart of our transformation," Fraser said in an interview. "We're building a modern, agile bank that can compete more effectively in the digital age."

Citigroup has faced regulatory scrutiny over its technology systems in recent years. In 2020, federal regulators imposed a $400 million fine and required the bank to upgrade its risk management systems. The bank has been working to address those concerns while also investing in new capabilities.

The digital transformation includes upgrading Citi's mobile banking app, enhancing its payments infrastructure, and deploying AI-powered tools for risk management and customer service. The bank is also building new data platforms to better analyze customer behavior and market trends.

"We're moving from legacy systems to modern, cloud-based infrastructure," said Tim Ryan, Citi's head of technology. "This will make us faster, more secure, and better able to serve our clients."

The technology investments are part of Citigroup's broader efforts to improve efficiency and compete with digital-first competitors. The bank has been losing market share to fintech companies and digital banks in some segments.`,
    publisher: 'CNBC',
    publishedDate: new Date('2024-10-25').toISOString(),
  },
];

