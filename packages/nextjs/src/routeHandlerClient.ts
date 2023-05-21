import {
	CookieAuthStorageAdapter,
	CookieOptions,
	CookieOptionsWithName,
	SupabaseClientOptionsWithoutAuth,
	createSupabaseClient
} from '@supabase/auth-helpers-shared';

import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

class NextRouteHandlerAuthStorageAdapter extends CookieAuthStorageAdapter {
	constructor(
		private readonly context: {
			cookies: () => ReadonlyRequestCookies;
		},
		cookieOptions?: CookieOptions
	) {
		super(cookieOptions);
	}

	protected getCookie(name: string): string | null | undefined {
		const nextCookies = this.context.cookies();
		return nextCookies.get(name)?.value;
	}
	protected setCookie(name: string, value: string): void {
		const nextCookies = this.context.cookies();
		nextCookies.set(name, value);
	}
	protected deleteCookie(name: string): void {
		const nextCookies = this.context.cookies();
		// @ts-expect-error Next.js need to fix their type for cookie options (3rd parameter on .set method)
		nextCookies.set(name, '', {
			maxAge: 0
		});
	}
}

export function createRouteHandlerClient<
	Database = any,
	SchemaName extends string & keyof Database = 'public' extends keyof Database
		? 'public'
		: string & keyof Database
>(
	context: {
		cookies: () => ReadonlyRequestCookies;
	},
	{
		supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
		supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		options,
		cookieOptions
	}: {
		supabaseUrl?: string;
		supabaseKey?: string;
		options?: SupabaseClientOptionsWithoutAuth<SchemaName>;
		cookieOptions?: CookieOptionsWithName;
	} = {}
) {
	if (!supabaseUrl || !supabaseKey) {
		throw new Error(
			'either NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env variables or supabaseUrl and supabaseKey are required!'
		);
	}

	return createSupabaseClient<Database, SchemaName>(supabaseUrl, supabaseKey, {
		...options,
		global: {
			...options?.global,
			headers: {
				...options?.global?.headers,
				'X-Client-Info': `${PACKAGE_NAME}@${PACKAGE_VERSION}`
			}
		},
		auth: {
			storageKey: cookieOptions?.name,
			storage: new NextRouteHandlerAuthStorageAdapter(context, cookieOptions)
		}
	});
}