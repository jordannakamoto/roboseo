import AltTagPanel from "./alt-tag-panel"
import { Button } from "@/components/ui/button"
/**
 * v0 by Vercel.
 * @see https://v0.dev/t/dIQtGOmibVk
 */
import { Label } from "@/components/ui/label"
import { Link2Icon } from "@radix-ui/react-icons"
import Sidebar from "@/components/mainPage/sidebar"
import TestBar from '@/components/misc/testbar'
import { Textarea } from "@/components/ui/textarea"

export default function Component() {

  return (
    <div className="flex w-full">
      <Sidebar/>
      <div className="grid gap-6 p-4 md:p-6" style={{ width: 800 }}>
      <div className="bg-white rounded-lg shadow-md dark:bg-gray-950">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-bold">HomePage</h2>
                <a href="your-url-here">
                <Button variant="outline">
                    <Link2Icon className="h-4 w-4" />
                </Button>
                </a>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <Label htmlFor="keywords" className="mr-2">Keywords</Label>
              <ul className="list-inside border border-gray-200 rounded p-4" style={{ fontSize: "13px" }}>
                <li>student apartments knoxville tn</li>
                <li>knoxville student apartments</li>
                <li>apartments for rent near university of tennessee knoxville</li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <div className="grid gap-1.5">
                <Label htmlFor="title-1-after" className="mr-2">Title</Label>
                <Textarea id="title-1-after" placeholder="Enter title here." />
                <Label htmlFor="meta-1-after" className="mr-2">Meta</Label>
                <Textarea id="meta-1-after" placeholder="Enter meta here." />
                <Label htmlFor="h1-1-after" className="mr-2">H1</Label>
                <Textarea id="h1-1-after" placeholder="Enter H1 here." />
                <Label htmlFor="onPage-1-after" className="mr-2">On-Page</Label>
                <Textarea id="onPage-1-after" placeholder="Enter copy here." />
              </div>
            </div>
          </div>
        </div>
        
      </div>
      {/* <AltTagPanel/> */}
      <TestBar/>
    </div>
  )
}
