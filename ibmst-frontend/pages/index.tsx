// @ts-ignore
import { Video } from 'components/Video';
import Head from "next/head";

export default function Home() {
  return (
    <div>
      <Head>
        <title> mediasoup </title>
      </Head>
      <Video/>
    </div>
  )
}
