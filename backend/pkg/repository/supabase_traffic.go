package repository

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/inin-zou/yongkang-as-a-agent/backend/pkg/model"
)

// RecordVisit stores one page view or crawler fetch.
func (r *SupabaseRepository) RecordVisit(v model.PageVisit) error {
	_, err := r.db.Exec(`
		INSERT INTO page_visits (path, landing, referrer, utm_source, utm_medium, utm_campaign, country, device, visitor, bot)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		v.Path, v.Landing, v.Referrer, v.UTMSource, v.UTMMedium, v.UTMCampaign, v.Country, v.Device, v.Visitor, v.Bot)
	if err != nil {
		return fmt.Errorf("failed to record visit: %w", err)
	}
	return nil
}

// trafficLimit caps every breakdown list.
const trafficLimit = 20

// GetTraffic aggregates page_visits since the given time. People and crawlers
// are separated by the bot column; sources and campaigns count landing views.
func (r *SupabaseRepository) GetTraffic(since time.Time) (*model.TrafficReport, error) {
	report := &model.TrafficReport{Daily: []model.TrafficDay{}, BotPages: []model.TrafficCount{}}
	err := r.db.QueryRow(`
		SELECT count(*), count(DISTINCT visitor), count(*) FILTER (WHERE landing)
		FROM page_visits WHERE created_at >= $1 AND bot = ''`, since).
		Scan(&report.Views, &report.Visitors, &report.Visits)
	if err != nil {
		return nil, fmt.Errorf("failed to count traffic: %w", err)
	}

	rows, err := r.db.Query(`
		SELECT to_char(created_at AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD') AS day, count(*), count(DISTINCT visitor)
		FROM page_visits WHERE created_at >= $1 AND bot = ''
		GROUP BY day ORDER BY day`, since)
	if err != nil {
		return nil, fmt.Errorf("failed to load daily traffic: %w", err)
	}
	for rows.Next() {
		var d model.TrafficDay
		if err := rows.Scan(&d.Date, &d.Views, &d.Visitors); err != nil {
			rows.Close()
			return nil, fmt.Errorf("failed to scan daily traffic: %w", err)
		}
		report.Daily = append(report.Daily, d)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to load daily traffic: %w", err)
	}

	breakdowns := []struct {
		into  *[]model.TrafficCount
		query string
	}{
		{&report.Referrers, `SELECT referrer, count(*), count(DISTINCT visitor) FROM page_visits
			WHERE created_at >= $1 AND bot = '' AND landing GROUP BY referrer ORDER BY 2 DESC, 1 LIMIT $2`},
		{&report.Campaigns, `SELECT concat_ws(' / ', utm_source, nullif(utm_medium, ''), nullif(utm_campaign, '')), count(*), count(DISTINCT visitor)
			FROM page_visits WHERE created_at >= $1 AND bot = '' AND landing AND utm_source <> ''
			GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT $2`},
		{&report.Pages, `SELECT path, count(*), count(DISTINCT visitor) FROM page_visits
			WHERE created_at >= $1 AND bot = '' GROUP BY path ORDER BY 2 DESC, 1 LIMIT $2`},
		{&report.Countries, `SELECT country, count(*), count(DISTINCT visitor) FROM page_visits
			WHERE created_at >= $1 AND bot = '' GROUP BY country ORDER BY 3 DESC, 1 LIMIT $2`},
		{&report.Devices, `SELECT device, count(*), count(DISTINCT visitor) FROM page_visits
			WHERE created_at >= $1 AND bot = '' GROUP BY device ORDER BY 3 DESC, 1 LIMIT $2`},
		{&report.Bots, `SELECT bot, count(*), 0 FROM page_visits
			WHERE created_at >= $1 AND bot <> '' GROUP BY bot ORDER BY 2 DESC, 1 LIMIT $2`},
	}
	for _, b := range breakdowns {
		counts, err := r.trafficCounts(b.query, since)
		if err != nil {
			return nil, err
		}
		*b.into = counts
	}

	rows, err = r.db.Query(`
		SELECT bot, path, count(*) FROM page_visits
		WHERE created_at >= $1 AND bot <> '' GROUP BY bot, path ORDER BY 3 DESC, 1, 2 LIMIT $2`, since, trafficLimit*2)
	if err != nil {
		return nil, fmt.Errorf("failed to load crawler pages: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var c model.TrafficCount
		if err := rows.Scan(&c.Bot, &c.Key, &c.Views); err != nil {
			return nil, fmt.Errorf("failed to scan crawler pages: %w", err)
		}
		report.BotPages = append(report.BotPages, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to load crawler pages: %w", err)
	}
	return report, nil
}

func (r *SupabaseRepository) trafficCounts(query string, since time.Time) ([]model.TrafficCount, error) {
	rows, err := r.db.Query(query, since, trafficLimit)
	if err != nil {
		return nil, fmt.Errorf("failed to load traffic breakdown: %w", err)
	}
	defer rows.Close()
	counts := []model.TrafficCount{}
	for rows.Next() {
		var c model.TrafficCount
		var key sql.NullString
		if err := rows.Scan(&key, &c.Views, &c.Visitors); err != nil {
			return nil, fmt.Errorf("failed to scan traffic breakdown: %w", err)
		}
		c.Key = key.String
		counts = append(counts, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to load traffic breakdown: %w", err)
	}
	return counts, nil
}
