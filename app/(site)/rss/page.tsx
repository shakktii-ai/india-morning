import SiteHeader from "../../_components/SiteHeader";
import SiteFooter from "../../_components/SiteFooter";
import CategoryTabs from "../../_components/CategoryTabs";

const feedCategories = [
  {
    title: "Main Feeds",
    feeds: [
      { id: "top", label: "Top Stories" },
      { id: "india", label: "India" },
      { id: "world", label: "World" },
      { id: "business", label: "Business" },
      { id: "sports", label: "Sports" },
    ]
  },
  {
    title: "Sections",
    feeds: [
      { id: "entertainment", label: "Entertainment" },
      { id: "tech", label: "Technology" },
      { id: "education", label: "Education" },
      { id: "health", label: "Health" },
      { id: "science", label: "Science" },
      { id: "auto", label: "Auto" },
    ]
  },
  {
    title: "Cities",
    feeds: [
      { id: "mumbai", label: "Mumbai" },
      { id: "delhi", label: "Delhi" },
      { id: "bengaluru", label: "Bengaluru" },
      { id: "hyderabad", label: "Hyderabad" },
      { id: "pune", label: "Pune" },
    ]
  }
];

export default function RSSPage() {
  return (
    <>
      <SiteHeader />
      <CategoryTabs />
      <main className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800 }}>RSS Feeds</h1>
            <div style={{ height: 4, flex: 1, background: "var(--accent)", marginLeft: 24, opacity: 0.2, borderRadius: 2 }} />
          </div>
          
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 48 }}>
            Stay updated with the latest news from around the world. IndiaMorning provides continuous RSS feeds for a variety of topics and regions. 
            Subscribe to your favorite sections and get news delivered directly to your feed reader.
          </p>

          <div style={{ display: 'grid', gap: 40 }}>
            {feedCategories.map((group) => (
              <section key={group.title}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: 20, paddingBottom: 10, borderBottom: '2px solid #F3F4F6' }}>{group.title}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {group.feeds.map((feed) => (
                    <div key={feed.id} className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{feed.label}</span>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <a 
                          href={`/api/news?category=${feed.id}&format=xml`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn"
                          style={{ 
                            background: 'orange', 
                            color: 'white', 
                            padding: '6px 14px', 
                            fontSize: '12px', 
                            fontWeight: 800,
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" />
                          </svg>
                          RSS
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="card" style={{ marginTop: 60, padding: 40, background: '#F9FAFB', border: 'none' }}>
            <h3 style={{ marginBottom: 16 }}>What is RSS?</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
              RSS (Really Simple Syndication) is a way for you to stay updated on the latest news from IndiaMorning. 
              Instead of visiting our site every day to check for new stories, you can subscribe to our RSS feeds 
              and have the latest headlines delivered directly to your RSS reader or aggregator.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
