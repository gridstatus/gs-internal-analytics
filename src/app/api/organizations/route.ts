import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { jsonError } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const id = searchParams.get('id');

  try {
    // If ID provided, get single org with users
    if (id) {
      const orgs = await query<{
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
      }>(`SELECT * FROM api_server.organizations WHERE id = $1`, [id]);

      if (orgs.length === 0) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      const org = orgs[0];

      const users = await query<{
        id: number;
        username: string;
        first_name: string;
        last_name: string;
        role: string;
        created_at: Date;
        last_active_at: Date;
      }>(`
        SELECT u.id, u.username, u.first_name, u.last_name, uo.role, u.created_at, u.last_active_at
        FROM api_server.users u
        JOIN api_server.user_organizations uo ON uo.user_id = u.id
        WHERE uo.organization_id = $1
        ORDER BY u.created_at DESC
      `, [id]);

      const stats = await query<{
        chart_count: string;
        dashboard_count: string;
        new_users_7d: string;
        active_users_7d: string;
      }>(`
        SELECT
          COUNT(DISTINCT c.id) as chart_count,
          COUNT(DISTINCT d.id) as dashboard_count,
          COUNT(DISTINCT CASE WHEN u.created_at >= NOW() - INTERVAL '7 days' THEN u.id END) as new_users_7d,
          COUNT(DISTINCT CASE WHEN u.last_active_at >= NOW() - INTERVAL '7 days' THEN u.id END) as active_users_7d
        FROM api_server.user_organizations uo
        LEFT JOIN api_server.users u ON u.id = uo.user_id
        LEFT JOIN api_server.charts c ON c.organization_id = uo.organization_id
        LEFT JOIN api_server.dashboards d ON d.organization_id = uo.organization_id
        WHERE uo.organization_id = $1
      `, [id]);

      // Get potential additions: users who share a domain with org members but aren't in the org
      const potentialAdditions = await query<{
        id: number;
        username: string;
        first_name: string;
        last_name: string;
        created_at: Date;
        last_active_at: Date;
        domain: string;
      }>(`
        WITH org_domains AS (
          SELECT DISTINCT SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) AS domain
          FROM api_server.users u
          JOIN api_server.user_organizations uo ON uo.user_id = u.id
          WHERE uo.organization_id = $1
            AND u.username LIKE '%@%'
        ),
        org_user_ids AS (
          SELECT DISTINCT uo.user_id
          FROM api_server.user_organizations uo
          WHERE uo.organization_id = $1
        )
        SELECT DISTINCT
          u.id,
          u.username,
          u.first_name,
          u.last_name,
          u.created_at,
          u.last_active_at,
          SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) AS domain
        FROM api_server.users u
        WHERE u.username LIKE '%@%'
          AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) IN (SELECT domain FROM org_domains)
          AND u.id NOT IN (SELECT user_id FROM org_user_ids)
        ORDER BY u.last_active_at DESC NULLS LAST, u.created_at DESC
        LIMIT 100
      `, [id]);

      return NextResponse.json({
        organization: {
          id: org.id,
          name: org.name,
          createdAt: org.created_at,
          updatedAt: org.updated_at,
        },
        users: users.map(u => ({
          id: u.id,
          username: u.username,
          firstName: u.first_name,
          lastName: u.last_name,
          role: u.role,
          createdAt: u.created_at,
          lastActiveAt: u.last_active_at,
        })),
        potentialAdditions: potentialAdditions.map(u => ({
          id: u.id,
          username: u.username,
          firstName: u.first_name,
          lastName: u.last_name,
          domain: u.domain,
          createdAt: u.created_at,
          lastActiveAt: u.last_active_at,
        })),
        stats: {
          chartCount: Number(stats[0]?.chart_count || 0),
          dashboardCount: Number(stats[0]?.dashboard_count || 0),
          userCount: users.length,
          newUsers7d: Number(stats[0]?.new_users_7d || 0),
          activeUsers7d: Number(stats[0]?.active_users_7d || 0),
        },
      });
    }

    // Search organizations
    const orgs = await query<{
      id: string;
      name: string;
      created_at: Date;
      user_count: string;
      new_users_7d: string;
      active_users_7d: string;
    }>(`
      SELECT 
        o.id, 
        o.name, 
        o.created_at, 
        COUNT(DISTINCT uo.user_id) as user_count,
        COUNT(DISTINCT CASE WHEN u.created_at >= NOW() - INTERVAL '7 days' THEN u.id END) as new_users_7d,
        COUNT(DISTINCT CASE WHEN u.last_active_at >= NOW() - INTERVAL '7 days' THEN u.id END) as active_users_7d
      FROM api_server.organizations o
      LEFT JOIN api_server.user_organizations uo ON uo.organization_id = o.id
      LEFT JOIN api_server.users u ON u.id = uo.user_id
      WHERE o.name ILIKE $1
      GROUP BY o.id, o.name, o.created_at
      ORDER BY COUNT(uo.user_id) DESC
      LIMIT 100
    `, [`%${search}%`]);

    return NextResponse.json({
      organizations: orgs.map(o => ({
        id: o.id,
        name: o.name,
        createdAt: o.created_at,
        userCount: Number(o.user_count),
        newUsers7d: Number(o.new_users_7d || 0),
        activeUsers7d: Number(o.active_users_7d || 0),
      })),
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return jsonError(error);
  }
}
